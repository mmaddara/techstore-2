(function (global) {
  'use strict';

  // Отдельный ключ модуля команды: каталог, корзина и избранное TechStore не затрагиваются.
  const STORAGE_KEY = 'techstore-people-zyaykin-v1';
  const privateAccess = new WeakMap();
  let nextId = 0;

  function validationError(message, field) {
    const error = new Error(message);
    error.field = field;
    return error;
  }

  function normalizeText(value, field, label, maxLength) {
    if (typeof value !== 'string') {
      throw validationError(`Укажите ${label}.`, field);
    }
    const text = value.trim().replace(/\s+/gu, ' ');
    if (!text || text.length > maxLength) {
      throw validationError(`${label}: от 1 до ${maxLength} символов.`, field);
    }
    return text;
  }

  function normalizeNumber(value, field, label, maximum, allowZero) {
    const isNumber = typeof value === 'number';
    const isNumericText = typeof value === 'string' && value.trim() !== '';
    const number = isNumber || isNumericText ? Number(value) : NaN;
    // Нижняя граница коэффициента совпадает с формой и предотвращает
    // переполнение отношения при аномально малых сохранённых значениях.
    if (!Number.isFinite(number) || number > maximum || (allowZero ? number < 0 : number < 0.001)) {
      const lowerBound = allowZero ? 'не меньше 0' : 'не меньше 0,001';
      throw validationError(`${label} должна быть ${lowerBound} и не больше ${maximum.toLocaleString('ru-RU')}.`, field);
    }
    return number;
  }

  function createId() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return global.crypto.randomUUID();
    }
    nextId += 1;
    return `employee-${Date.now().toString(36)}-${nextId.toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function normalizeRecord(record, currentId) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throw validationError('Данные сотрудника должны быть объектом.', 'fullName');
    }
    const fullName = normalizeText(record.fullName, 'fullName', 'ФИО', 120);
    if (fullName.split(' ').length < 2) {
      throw validationError('Укажите как минимум фамилию и имя.', 'fullName');
    }
    const id = currentId || (record.id === undefined ? createId() : record.id);
    if (typeof id !== 'string' || !id.trim() || id.length > 128) {
      throw validationError('Некорректный идентификатор сотрудника.', 'id');
    }
    return {
      id,
      fullName,
      position: normalizeText(record.position, 'position', 'Должность', 100),
      salary: normalizeNumber(record.salary, 'salary', 'Зарплата', 1000000000, true),
      efficiency: normalizeNumber(record.efficiency, 'efficiency', 'Эффективность', 100, false),
    };
  }

  class Employee {
    constructor(record) {
      // Приватное состояние живёт в замыкании конструктора. Получить или заменить
      // зарплату и эффективность напрямую снаружи нельзя: доступ есть только у методов.
      let privateRecord = normalizeRecord(record);
      privateAccess.set(this, {
        read: () => ({ ...privateRecord }),
        write: (nextRecord) => { privateRecord = nextRecord; },
      });

      // Стрелка запоминает this экземпляра из конструктора. Поэтому её можно
      // передать отдельно: bind/call не смогут переназначить её this.
      this.getSummary = () => `${this.fullName} · ${this.position}`;
    }

    // Обычные методы и геттеры класса находятся в Employee.prototype и общие
    // для всех сотрудников. Их this определяется объектом, на котором вызван метод.
    get id() { return privateAccess.get(this).read().id; }
    get fullName() { return privateAccess.get(this).read().fullName; }
    get position() { return privateAccess.get(this).read().position; }
    get salary() { return privateAccess.get(this).read().salary; }
    get efficiency() { return privateAccess.get(this).read().efficiency; }
    get utilization() { return this.getUtilization(); }

    getSurname() {
      return this.fullName.split(' ')[0];
    }

    getUtilization() {
      return this.salary / this.efficiency;
    }

    update(changes) {
      if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
        throw validationError('Передайте новые данные сотрудника.', 'fullName');
      }
      const access = privateAccess.get(this);
      // Сначала проверяем весь новый объект. Ошибка не оставляет запись
      // наполовину изменённой, а id сотрудника остаётся постоянным.
      const nextRecord = normalizeRecord({ ...access.read(), ...changes }, this.id);
      access.write(nextRecord);
      return this;
    }

    toJSON() {
      return privateAccess.get(this).read();
    }
  }

  const demoEmployees = Object.freeze([
    Object.freeze({ id: 'demo-01', fullName: 'Зайцев Артём Николаевич', position: 'Руководитель магазина', salary: 115000, efficiency: 1.25 }),
    Object.freeze({ id: 'demo-02', fullName: 'Кириллова София Павловна', position: 'Старший консультант', salary: 78000, efficiency: 1.3 }),
    Object.freeze({ id: 'demo-03', fullName: 'Егоров Дмитрий Максимович', position: 'Сервисный инженер', salary: 98000, efficiency: 1.4 }),
    Object.freeze({ id: 'demo-04', fullName: 'Власова Ксения Андреевна', position: 'Логист', salary: 72000, efficiency: 1.05 }),
    Object.freeze({ id: 'demo-05', fullName: 'Фёдоров Михаил Олегович', position: 'Консультант по технике', salary: 65000, efficiency: 0.9 }),
    Object.freeze({ id: 'demo-06', fullName: 'Романова Полина Викторовна', position: 'Координатор заказов', salary: 68000, efficiency: 0.75 }),
  ]);

  function createEmployeeStore(storage) {
    // Массив скрыт замыканием фабрики: внешнему коду отдаётся только его копия.
    let employees = [];
    let persistent = true;
    let storageWarning = '';
    let recoveryWarning = '';

    function disableStorage() {
      persistent = false;
      storageWarning = 'Браузер не разрешил сохранить данные. Изменения доступны до закрытия страницы.';
    }

    if (arguments.length === 0) {
      try {
        storage = global.localStorage;
      } catch (error) {
        disableStorage();
      }
    }
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
      disableStorage();
    }

    function hydrate(records) {
      if (!Array.isArray(records)) throw new Error('Ожидается список сотрудников.');
      const next = records.map((record) => new Employee(record instanceof Employee ? record.toJSON() : record));
      if (new Set(next.map((employee) => employee.id)).size !== next.length) {
        throw validationError('Идентификаторы сотрудников должны быть уникальными.', 'id');
      }
      return next;
    }

    function save() {
      if (!persistent) return false;
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(employees));
        return true;
      } catch (error) {
        disableStorage();
        return false;
      }
    }

    let saved = null;
    if (persistent) {
      try {
        saved = storage.getItem(STORAGE_KEY);
      } catch (error) {
        disableStorage();
      }
    }
    if (saved === null) {
      employees = hydrate(demoEmployees);
      save();
    } else {
      try {
        // Сохранённый [] — осознанно пустая команда, а не повод вернуть примеры.
        employees = hydrate(JSON.parse(saved));
      } catch (error) {
        employees = hydrate(demoEmployees);
        recoveryWarning = 'Сохранённые данные повреждены. Загружен пример команды.';
        save();
      }
    }

    return {
      get isPersistent() { return persistent; },
      get warning() { return storageWarning || recoveryWarning; },
      getAll() { return employees.slice(); },
      add(record) {
        const employee = new Employee(record);
        if (employees.some((item) => item.id === employee.id)) {
          throw validationError('Сотрудник с таким идентификатором уже есть.', 'id');
        }
        employees.push(employee);
        save();
        return employee;
      },
      update(id, record) {
        const employee = employees.find((item) => item.id === id);
        if (!employee) return null;
        employee.update(record);
        save();
        return employee;
      },
      remove(id) {
        const index = employees.findIndex((item) => item.id === id);
        if (index < 0) return null;
        const removed = employees.splice(index, 1)[0].toJSON();
        save();
        return removed;
      },
      replace(records) {
        employees = hydrate(records);
        save();
        return employees.slice();
      },
      save,
    };
  }

  global.TeamModel = Object.freeze({ Employee, createEmployeeStore, demoEmployees });
})(typeof window !== 'undefined' ? window : globalThis);
