'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'employee.js'), 'utf8');
const context = vm.createContext({ console });
vm.runInContext(source, context);
const { Employee, createEmployeeStore, demoEmployees } = context.TeamModel;
const record = (overrides = {}) => ({ fullName: 'Иванов Иван Иванович', position: 'Дизайнер', salary: 100000, efficiency: 1.25, ...overrides });
function memoryStorage(initial) {
  const data = new Map();
  if (initial !== undefined) data.set('techstore-people-zyaykin-v1', initial);
  return { getItem: (key) => data.has(key) ? data.get(key) : null, setItem: (key, value) => data.set(key, value) };
}

test('Employee: normalization, shared prototype, closure privacy and utilization', () => {
  const employee = new Employee(record({ fullName: '  Иванов   Иван   Иванович  ', salary: '100000', efficiency: '1.25' }));
  assert.equal(employee.fullName, 'Иванов Иван Иванович');
  assert.equal(employee.getSurname(), 'Иванов');
  assert.equal(employee.salary, 100000);
  assert.equal(employee.getUtilization(), 80000);
  assert.equal(employee.utilization, 80000);
  assert.equal(employee.getUtilization, new Employee(record()).getUtilization);
  assert.throws(() => { employee.salary = 1; }, TypeError);
  const exported = employee.toJSON();
  exported.salary = 1;
  assert.equal(employee.salary, 100000);
});

test('Validation rejects nonfinite, nonnumeric and out-of-range values', () => {
  for (const salary of [-1, NaN, Infinity, '', null, true, [], 1e9 + 1]) {
    assert.throws(() => new Employee(record({ salary })), (error) => error.field === 'salary');
  }
  for (const efficiency of [0, -1, Number.MIN_VALUE, 0.0001, NaN, Infinity, '', null, false, [], 100.01]) {
    assert.throws(() => new Employee(record({ efficiency })), (error) => error.field === 'efficiency');
  }
  assert.equal(new Employee(record({ salary: 0, efficiency: 0.001 })).utilization, 0);
  assert.equal(new Employee(record({ salary: 100, efficiency: 0.001 })).utilization, 100000);
  assert.ok(Number.isFinite(new Employee(record({ salary: 1e9, efficiency: 0.001 })).utilization));
  assert.equal(new Employee(record({ salary: 1e9, efficiency: 100 })).utilization, 1e7);
  assert.throws(() => new Employee(record({ fullName: 'Иванов' })), (error) => error.field === 'fullName');
  assert.throws(() => new Employee(record({ position: ' ' })), (error) => error.field === 'position');
});

test('Update is atomic and keeps identity', () => {
  const employee = new Employee(record({ id: 'same' }));
  assert.throws(() => employee.update({ fullName: 'Петров Пётр Петрович', efficiency: 0 }));
  assert.equal(employee.fullName, 'Иванов Иван Иванович');
  assert.equal(employee.efficiency, 1.25);
  assert.equal(employee.update({ salary: 150000, id: 'changed' }), employee);
  assert.equal(employee.id, 'same');
  assert.equal(employee.salary, 150000);
});

test('Arrow lexical this and prototype method bind/call behavior', () => {
  const employee = new Employee(record());
  const summary = employee.getSummary;
  assert.equal(summary(), 'Иванов Иван Иванович · Дизайнер');
  assert.equal(summary.call({ fullName: 'Другой' }), summary());
  const utilization = employee.getUtilization.bind(employee);
  assert.equal(utilization(), 80000);
  assert.equal(Employee.prototype.getUtilization.call({ salary: 250, efficiency: 0.5 }), 500);
});

test('Store seeds once, restores Employee instances and saved empty array', () => {
  const storage = memoryStorage();
  const store = createEmployeeStore(storage);
  assert.equal(store.getAll().length, 6);
  const added = store.add(record({ id: 'added' }));
  const restored = createEmployeeStore(storage);
  assert.equal(restored.getAll().length, 7);
  assert.ok(restored.getAll().every((employee) => employee instanceof Employee));
  assert.equal(restored.update(added.id, { salary: 123456 }).salary, 123456);
  assert.equal(restored.remove(added.id).salary, 123456);
  assert.equal(restored.remove('absent'), null);
  assert.equal(restored.update('absent', {}), null);
  restored.replace([]);
  assert.equal(createEmployeeStore(storage).getAll().length, 0);
});

test('Store protects array, detects duplicate ids and validates replace atomically', () => {
  const store = createEmployeeStore(memoryStorage());
  store.getAll().pop();
  assert.equal(store.getAll().length, 6);
  assert.throws(() => store.add(record({ id: 'demo-01' })));
  assert.throws(() => store.replace([record({ id: 'same' }), record({ id: 'same' })]));
  assert.throws(() => store.replace([record(), record({ efficiency: 0 })]));
  assert.equal(store.getAll().length, 6);
});

test('Failed read/write and missing storage retain working in-memory store', () => {
  const badRead = { getItem() { throw new Error('Denied'); }, setItem() {} };
  const badWrite = { getItem() { return null; }, setItem() { throw new Error('Quota'); } };
  for (const storage of [badRead, badWrite, null]) {
    const store = createEmployeeStore(storage);
    assert.equal(store.isPersistent, false);
    assert.ok(store.warning);
    assert.equal(store.save(), false);
    store.replace([]);
    assert.equal(store.add(record()).getSurname(), 'Иванов');
    assert.equal(store.getAll().length, 1);
  }
});

test('Corrupt data recovers safely with status; equal utilization remains equal', () => {
  for (const saved of ['{', '{}', '[{"fullName":"Иванов Иван"}]', JSON.stringify([record({ efficiency: Number.MIN_VALUE })])]) {
    const store = createEmployeeStore(memoryStorage(saved));
    assert.equal(store.getAll().length, 6);
    assert.ok(store.warning.includes('повреждены'));
  }
  const first = new Employee(record({ salary: 100000, efficiency: 1 }));
  const second = new Employee(record({ salary: 50000, efficiency: 0.5 }));
  assert.equal(first.utilization, second.utilization);
  const values = demoEmployees.map((value) => new Employee(value).utilization);
  assert.equal(values.filter((value) => value === Math.min(...values)).length, 1);
  assert.equal(values.filter((value) => value === Math.max(...values)).length, 1);
});

test('People store does not change TechStore catalogue, cart, favourites or original assignment', () => {
  const storage = memoryStorage();
  const catalog = JSON.stringify({ cart: { laptop: 2 }, favourites: ['phone'], products: [{ id: 'laptop' }] });
  const originalAssignment = JSON.stringify([record({ id: 'original-employee' })]);
  storage.setItem('techstore-v1', catalog);
  storage.setItem('atelier-employees-v1', originalAssignment);
  const store = createEmployeeStore(storage);
  assert.equal(store.getAll().length, 6);
  store.replace([]);
  const employee = store.add(record({ id: 'people-only' }));
  store.update(employee.id, { salary: 85000 });
  store.remove(employee.id);
  assert.equal(storage.getItem('techstore-v1'), catalog);
  assert.equal(storage.getItem('atelier-employees-v1'), originalAssignment);
  assert.equal(storage.getItem('techstore-people-zyaykin-v1'), '[]');
});
