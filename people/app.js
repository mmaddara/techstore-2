/* Приложение не создаёт глобальных переменных: его состояние живёт в замыкании IIFE. */
(() => {
  'use strict';

  const { createEmployeeStore } = window.TeamModel;
  const byId = (id) => document.getElementById(id);
  const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
  const coefficient = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  const collator = new Intl.Collator('ru', { sensitivity: 'base', numeric: true });
  const normalize = (text) => text.trim().toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');
  const equal = (a, b) => Math.abs(a - b) <= Number.EPSILON * 8 * Math.max(1, Math.abs(a), Math.abs(b));
  const node = (tag, className, text) => {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (text !== undefined) result.textContent = text;
    return result;
  };
  const icons = {
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 3 5 5-12 12H4v-5L16 3Z"/><path d="m13 6 5 5"/></svg>',
    remove: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></svg>'
  };
  const plural = (count) => {
    const last = count % 10;
    const lastTwo = count % 100;
    if (lastTwo >= 11 && lastTwo <= 14) return 'сотрудников';
    return last === 1 ? 'сотрудник' : last >= 2 && last <= 4 ? 'сотрудника' : 'сотрудников';
  };

  const app = {
    store: createEmployeeStore(),
    calculated: false,
    editingId: null,
    efficiencyId: null,
    deletingId: null,
    undo: null,
    toastTimer: null,

    init() {
      byId('today').textContent = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
      byId('today').dateTime = new Date().toISOString().slice(0, 10);

      // bind возвращает обычный обработчик с закреплённым this === app.
      // Без bind браузер вызвал бы onEmployeeSubmit с this === HTMLFormElement.
      byId('employee-form').addEventListener('submit', this.onEmployeeSubmit.bind(this));
      byId('efficiency-form').addEventListener('submit', this.onEfficiencySubmit.bind(this));

      // У стрелок нет собственного this: они захватывают this метода init (объект app).
      byId('add-button').addEventListener('click', () => this.openEmployee());
      byId('calculate-button').addEventListener('click', () => this.calculate());
      byId('search').addEventListener('input', () => this.render());
      byId('sort').addEventListener('change', () => this.render());
      byId('about-button').addEventListener('click', () => byId('about-dialog').showModal());
      byId('export-button').addEventListener('click', () => this.exportCSV());
      byId('confirm-delete').addEventListener('click', () => this.confirmDelete());
      byId('undo-button').addEventListener('click', () => {
        if (this.undo) this.undo();
      });
      byId('dismiss-toast').addEventListener('click', () => this.hideToast());
      byId('empty-action').addEventListener('click', () => {
        if (byId('search').value) {
          byId('search').value = '';
          this.render();
          byId('search').focus();
        } else this.openEmployee();
      });

      // Делегирование событий: таблица пересоздаётся, а её обработчик остаётся один.
      byId('employee-rows').addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const { action, id } = button.dataset;
        if (action === 'edit') this.openEmployee(id);
        if (action === 'efficiency') this.openEfficiency(id);
        if (action === 'remove') this.openDelete(id);
      });
      document.querySelectorAll('.close-dialog').forEach((button) => {
        button.addEventListener('click', () => button.closest('dialog').close());
      });
      document.querySelectorAll('dialog').forEach((dialog) => {
        dialog.addEventListener('click', (event) => {
          const rect = dialog.getBoundingClientRect();
          if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
        });
      });
      byId('employee-form').addEventListener('input', (event) => {
        event.target.setCustomValidity?.('');
        byId('form-error').hidden = true;
      });
      byId('efficiency-form').addEventListener('input', () => { byId('efficiency-error').hidden = true; });
      document.addEventListener('keydown', (event) => {
        if (event.key === '/' && !document.querySelector('dialog[open]') && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          byId('search').focus();
        }
      });
      document.querySelectorAll('a.nav-link').forEach((link) => link.addEventListener('click', () => {
        document.querySelectorAll('a.nav-link').forEach((item) => item.classList.toggle('active', item === link));
      }));
      this.render();
      if (this.store.warning) this.notify(this.store.warning, null, 9000);
    },

    getExtremes(employees) {
      if (!employees.length) return null;
      const values = employees.map((employee) => employee.getUtilization());
      // reduce не ограничен лимитом аргументов, в отличие от Math.min(...большойМассив).
      const min = values.reduce((value, current) => Math.min(value, current), Infinity);
      const max = values.reduce((value, current) => Math.max(value, current), -Infinity);
      return { min, max, same: equal(min, max), average: values.reduce((sum, value) => sum + value, 0) / values.length };
    },

    render() {
      const employees = this.store.getAll();
      const query = normalize(byId('search').value);
      const extremes = this.calculated ? this.getExtremes(employees) : null;
      const sorted = employees.filter((employee) => normalize(employee.getSurname()).includes(query));
      const order = byId('sort').value;
      // Стрелки удобны для коротких чистых колбэков фильтрации и сортировки.
      sorted.sort((a, b) => {
        const fallback = collator.compare(a.fullName, b.fullName);
        if (order === 'salary') return b.salary - a.salary || fallback;
        if (this.calculated && order === 'util-asc') return a.getUtilization() - b.getUtilization() || fallback;
        if (this.calculated && order === 'util-desc') return b.getUtilization() - a.getUtilization() || fallback;
        return fallback;
      });
      byId('nav-count').textContent = employees.length;
      byId('team-count').textContent = employees.length;
      byId('stat-count').replaceChildren(document.createTextNode(number.format(employees.length)), node('span', '', 'человек'));
      byId('stat-payroll').replaceChildren(document.createTextNode(number.format(employees.reduce((sum, employee) => sum + employee.salary, 0))), node('span', '', '₽ / мес.'));
      byId('stat-efficiency').replaceChildren(document.createTextNode(coefficient.format(employees.length ? employees.reduce((sum, employee) => sum + employee.efficiency, 0) / employees.length : 0)), node('span', '', 'коэффициент'));
      const fragment = document.createDocumentFragment();
      sorted.forEach((employee, index) => fragment.append(this.renderRow(employee, index, extremes)));
      byId('employee-rows').replaceChildren(fragment);
      byId('results-count').textContent = query ? `Найдено ${sorted.length} из ${employees.length}` : `Показано ${employees.length} ${plural(employees.length)}`;
      byId('empty-state').hidden = sorted.length !== 0;
      byId('empty-title').textContent = query ? 'Никого не нашли' : 'Здесь начинается ваша команда';
      byId('empty-description').textContent = query ? `По фамилии «${byId('search').value.trim()}» нет совпадений. Попробуйте другой запрос.` : 'Добавьте первого сотрудника, чтобы увидеть общую картину.';
      byId('empty-action').textContent = query ? 'Сбросить поиск' : 'Добавить сотрудника';
      byId('calculate-button').disabled = employees.length === 0;
      byId('export-button').disabled = employees.length === 0;
      byId('legend').hidden = !extremes || extremes.same;
      byId('table-hint').hidden = Boolean(extremes && !extremes.same);
      byId('table-hint').textContent = extremes?.same ? 'Все показатели равны' : 'Коэффициент можно изменить нажатием';
      byId('insights').hidden = !extremes;
      byId('analysis-title').textContent = extremes ? 'Каждый результат — на своём месте' : 'Узнайте стоимость результата';
      byId('calculate-button').querySelector('span').textContent = this.calculated ? 'Пересчитать утилизацию' : 'Рассчитать утилизацию';
      byId('sort').querySelectorAll('option[value^="util-"]').forEach((option) => { option.disabled = !this.calculated; });
      if (extremes) this.renderInsights(employees, extremes);
      this.updateStorageStatus();
    },

    renderRow(employee, index, extremes) {
      const row = node('tr');
      row.dataset.id = employee.id;
      const value = employee.getUtilization();
      const isBest = extremes && equal(value, extremes.min);
      const isWorst = extremes && equal(value, extremes.max);
      if (extremes?.same) row.className = 'row-equal';
      else if (isBest) row.className = 'row-best';
      else if (isWorst) row.className = 'row-worst';
      row.append(node('td', 'number-col', String(index + 1).padStart(2, '0')));
      const identity = node('td');
      const content = node('div', 'employee-cell');
      const initials = employee.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('ru-RU');
      const avatar = node('span', 'employee-avatar', initials);
      avatar.setAttribute('aria-hidden', 'true');
      avatar.dataset.color = String([...employee.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4);
      const details = node('div');
      details.append(node('div', 'employee-name', employee.fullName), node('div', 'employee-position', employee.position));
      content.append(avatar, details);
      identity.append(content);
      const salary = node('td', 'numeric salary-value');
      salary.append(document.createTextNode(`${number.format(employee.salary)} `), node('span', 'currency', '₽'));
      const efficiency = node('td', 'numeric');
      const efficiencyButton = node('button', 'efficiency-button', coefficient.format(employee.efficiency));
      efficiencyButton.type = 'button';
      efficiencyButton.dataset.action = 'efficiency';
      efficiencyButton.dataset.id = employee.id;
      efficiencyButton.title = 'Изменить коэффициент в отдельном окне';
      efficiencyButton.setAttribute('aria-label', `Эффективность ${employee.fullName}: ${coefficient.format(employee.efficiency)}. Изменить`);
      efficiency.append(efficiencyButton);
      const utilization = node('td', 'numeric');
      utilization.append(node('span', this.calculated ? 'util-value' : 'pending-util', this.calculated ? `${number.format(value)} ₽` : '—'));
      if (extremes?.same) utilization.append(node('span', 'rank-tag', 'равный показатель'));
      else if (isBest) utilization.append(node('span', 'rank-tag', '↗ лучший показатель'));
      else if (isWorst) utilization.append(node('span', 'rank-tag', 'максимум'));
      const actions = node('td');
      const actionGroup = node('div', 'row-actions');
      [['edit', 'Редактировать'], ['remove', 'Удалить']].forEach(([action, label]) => {
        const button = node('button', `icon-button ${action === 'remove' ? 'delete-action' : ''}`);
        button.type = 'button';
        button.dataset.action = action;
        button.dataset.id = employee.id;
        button.title = label;
        button.setAttribute('aria-label', `${label}: ${employee.fullName}`);
        // Только собственные статические SVG. Любые пользовательские данные выводятся через textContent.
        button.innerHTML = icons[action];
        actionGroup.append(button);
      });
      actions.append(actionGroup);
      row.append(identity, salary, efficiency, utilization, actions);
      return row;
    },

    renderInsights(employees, extremes) {
      const best = employees.filter((employee) => equal(employee.getUtilization(), extremes.min));
      const worst = employees.filter((employee) => equal(employee.getUtilization(), extremes.max));
      byId('best-name').textContent = best.map((employee) => employee.fullName).join(', ');
      byId('worst-name').textContent = extremes.same ? 'Все показатели равны' : worst.map((employee) => employee.fullName).join(', ');
      [['best-value', extremes.min], ['worst-value', extremes.max], ['average-value', extremes.average]].forEach(([id, value]) => {
        byId(id).replaceChildren(document.createTextNode(number.format(value)), node('span', '', ' ₽ / ед.'));
      });
      byId('best-detail').textContent = `${best.length > 1 ? `Совпадение у ${best.length} сотрудников. ` : ''}Минимальная стоимость единицы эффективности.`;
      byId('worst-detail').textContent = extremes.same ? 'Минимум и максимум совпадают. Разницы между показателями нет.' : `${worst.length > 1 ? `Совпадение у ${worst.length} сотрудников. ` : ''}Максимальная стоимость единицы эффективности.`;
    },

    calculate() {
      if (!this.store.getAll().length) return;
      this.calculated = true;
      byId('sort').value = 'util-asc';
      this.render();
      this.notify('Расчёт готов. Команда отсортирована по утилизации.');
    },

    openEmployee(id = null) {
      this.editingId = id;
      const employee = id ? this.store.getAll().find((item) => item.id === id) : null;
      if (id && !employee) return;
      const form = byId('employee-form');
      form.reset();
      [...form.elements].forEach((input) => input.setCustomValidity?.(''));
      byId('form-error').hidden = true;
      byId('dialog-title').textContent = employee ? 'Редактировать сотрудника' : 'Новый сотрудник';
      byId('save-button').textContent = employee ? 'Сохранить изменения' : 'Добавить сотрудника';
      if (employee) ['fullName', 'position', 'salary', 'efficiency'].forEach((key) => { form.elements[key].value = employee[key]; });
      byId('employee-dialog').showModal();
      byId('fullName').focus();
    },

    onEmployeeSubmit(event) {
      event.preventDefault();
      const record = Object.fromEntries(new FormData(event.currentTarget));
      record.salary = Number(record.salary);
      record.efficiency = Number(record.efficiency);
      try {
        const editing = Boolean(this.editingId);
        if (editing) this.store.update(this.editingId, record);
        else this.store.add(record);
        byId('employee-dialog').close();
        this.render();
        this.notify(editing ? 'Изменения сохранены.' : 'Новый сотрудник в команде.');
      } catch (error) {
        byId('form-error').textContent = error.message;
        byId('form-error').hidden = false;
        const field = event.currentTarget.elements[error.field];
        if (field) { field.setCustomValidity(error.message); field.reportValidity(); field.focus(); }
      }
    },

    openEfficiency(id) {
      const employee = this.store.getAll().find((item) => item.id === id);
      if (!employee) return;
      this.efficiencyId = id;
      byId('efficiency-person').textContent = employee.getSummary();
      byId('quick-efficiency').value = employee.efficiency;
      byId('efficiency-error').hidden = true;
      byId('efficiency-dialog').showModal();
      byId('quick-efficiency').focus();
    },

    onEfficiencySubmit(event) {
      event.preventDefault();
      try {
        this.store.update(this.efficiencyId, { efficiency: Number(byId('quick-efficiency').value) });
        byId('efficiency-dialog').close();
        this.render();
        this.notify(this.calculated ? 'Эффективность и расчёт обновлены.' : 'Коэффициент эффективности сохранён.');
      } catch (error) {
        byId('efficiency-error').textContent = error.message;
        byId('efficiency-error').hidden = false;
      }
    },

    openDelete(id) {
      const employee = this.store.getAll().find((item) => item.id === id);
      if (!employee) return;
      this.deletingId = id;
      byId('delete-description').textContent = `${employee.fullName} будет удалён из команды. Сразу после удаления действие можно отменить.`;
      byId('delete-dialog').showModal();
      byId('delete-dialog').querySelector('.dialog-actions .close-dialog').focus();
    },

    confirmDelete() {
      const removed = this.store.remove(this.deletingId);
      byId('delete-dialog').close();
      if (!removed) return;
      this.render();
      byId('add-button').focus({ preventScroll: true });
      // Замыкание сохраняет запись конкретного удалённого сотрудника для отмены.
      this.notify('Сотрудник удалён из команды.', () => {
        this.store.add(removed);
        this.render();
        this.notify('Сотрудник восстановлен.');
      }, 10000);
    },

    updateStorageStatus() {
      const status = byId('storage-status');
      status.replaceChildren(document.createTextNode(this.store.isPersistent ? 'Данные в этом браузере' : 'Данные только в этой вкладке'), node('small', '', this.store.isPersistent ? 'Без облака и регистрации' : 'Для сохранения скачайте CSV'));
    },

    notify(message, undo = null, duration = 5500) {
      clearTimeout(this.toastTimer);
      this.undo = undo;
      const persistenceWarning = !this.store.isPersistent ? ' Хранилище недоступно: данные только в этой вкладке.' : '';
      byId('toast-text').textContent = message + persistenceWarning;
      byId('undo-button').hidden = !undo;
      byId('toast').hidden = false;
      this.toastTimer = setTimeout(() => this.hideToast(), duration);
    },

    hideToast() {
      clearTimeout(this.toastTimer);
      byId('toast').hidden = true;
      this.undo = null;
    },

    exportCSV() {
      // Все сотрудники, без влияния поискового фильтра. Защита от формул при открытии CSV в таблицах.
      const escape = (value) => {
        let text = String(value);
        if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
        return `"${text.replace(/"/g, '""')}"`;
      };
      const rows = [['ФИО', 'Должность', 'Зарплата (руб.)', 'Эффективность', 'Утилизация (руб./ед.)'], ...this.store.getAll().map((employee) => [employee.fullName, employee.position, employee.salary, employee.efficiency, this.calculated ? employee.getUtilization() : ''])];
      const blob = new Blob(['\uFEFF', rows.map((row) => row.map(escape).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = node('a');
      link.href = url;
      link.download = 'TechStore — команда.csv';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.notify('Таблица всей команды экспортирована в CSV.');
    }
  };

  app.init();
})();
