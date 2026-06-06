// app.js

const STORAGE_KEY = "simple_todos_v1";

const refs = {
  todoForm: document.getElementById("todoForm"),
  todoInput: document.getElementById("todoInput"),
  todoList: document.getElementById("todoList"),
  activeText: document.getElementById("activeText"),
  filterButtons: Array.from(document.querySelectorAll(".filter-btn")),
  clearCompletedBtn: document.getElementById("clearCompletedBtn"),
  markAllBtn: document.getElementById("markAllBtn"),
};

const state = {
  todos: [],
  filter: "all",
};

function loadTodos() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      state.todos = parsed;
    }
  } catch (error) {
    state.todos = [];
    console.warn("Falha ao carregar tarefas do localStorage:", error);
  }
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.todos));
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function sync() {
  saveTodos();
  render();
}

function getActiveCount() {
  return state.todos.filter((todo) => !todo.completed).length;
}

function getCompletedCount() {
  return state.todos.length - getActiveCount();
}

function addTodo(text) {
  const value = text.trim();
  if (!value) return;

  state.todos.unshift({ id: createId(), text: value, completed: false });
  sync();
}

function updateTodo(id, changes) {
  state.todos = state.todos.map((todo) => (todo.id === id ? { ...todo, ...changes } : todo));
}

function toggleTodo(id) {
  const todo = state.todos.find((item) => item.id === id);
  if (!todo) return;
  updateTodo(id, { completed: !todo.completed });
  sync();
}

function deleteTodo(id) {
  state.todos = state.todos.filter((todo) => todo.id !== id);
  sync();
}

function clearCompleted() {
  if (getCompletedCount() === 0) return;
  state.todos = state.todos.filter((todo) => !todo.completed);
  sync();
}

function markAllCompleted() {
  if (state.todos.length === 0) return;
  state.todos = state.todos.map((todo) => ({ ...todo, completed: true }));
  sync();
}

function setFilter(filter) {
  state.filter = filter;
  updateFilterButtons();
  render();
}

function filteredTodos() {
  if (state.filter === "active") return state.todos.filter((todo) => !todo.completed);
  if (state.filter === "done") return state.todos.filter((todo) => todo.completed);
  return state.todos;
}

function updateFilterButtons() {
  refs.filterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === state.filter);
  });
}

function render() {
  const todos = filteredTodos();
  const activeCount = getActiveCount();
  const completedCount = getCompletedCount();

  refs.activeText.textContent = activeCount === 0
    ? "Nenhuma tarefa pendente 🎉"
    : `${activeCount} tarefa${activeCount > 1 ? "s" : ""} pendente${activeCount > 1 ? "s" : ""}`;

  if (refs.clearCompletedBtn) refs.clearCompletedBtn.disabled = completedCount === 0;
  if (refs.markAllBtn) refs.markAllBtn.disabled = state.todos.length === 0;

  refs.todoList.innerHTML = "";

  if (todos.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = state.todos.length === 0
      ? "Adicione sua primeira tarefa acima ☝️"
      : "Nenhuma tarefa nesta vista. Tente outro filtro.";
    refs.todoList.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  todos.forEach((todo) => fragment.appendChild(createTodoItem(todo)));
  refs.todoList.appendChild(fragment);
}

function createTodoItem(todo) {
  const item = document.createElement("div");
  item.className = "todo-item";

  const checkBtn = document.createElement("button");
  checkBtn.type = "button";
  checkBtn.className = "check-btn";
  checkBtn.title = todo.completed ? "Desmarcar tarefa" : "Marcar tarefa como concluída";
  checkBtn.setAttribute("aria-pressed", String(todo.completed));
  checkBtn.innerHTML = todo.completed ? "✅" : "";
  checkBtn.addEventListener("click", () => toggleTodo(todo.id));
  item.appendChild(checkBtn);

  const text = document.createElement("span");
  text.className = `todo-text${todo.completed ? " done" : ""}`;
  text.tabIndex = 0;
  text.textContent = todo.text;
  text.addEventListener("dblclick", () => startEdit(todo, text));
  text.addEventListener("keydown", (event) => {
    if (event.key === "Enter") startEdit(todo, text);
  });
  item.appendChild(text);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "del-btn";
  deleteBtn.title = "Excluir tarefa";
  deleteBtn.setAttribute("aria-label", `Excluir ${todo.text}`);
  deleteBtn.textContent = "🗑️";
  deleteBtn.addEventListener("click", () => deleteTodo(todo.id));
  item.appendChild(deleteBtn);

  requestAnimationFrame(() => item.classList.add("visible"));
  return item;
}

function startEdit(todo, element) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "edit-input";
  input.value = todo.text;
  input.setAttribute("aria-label", `Editar tarefa: ${todo.text}`);

  element.replaceWith(input);
  input.focus();
  input.setSelectionRange(0, input.value.length);

  let finished = false;
  const completeEdit = (save) => {
    if (finished) return;
    finished = true;

    if (save) {
      const value = input.value.trim();
      if (value) {
        updateTodo(todo.id, { text: value });
        saveTodos();
      }
    }

    render();
  };

  input.addEventListener("blur", () => completeEdit(true));
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") completeEdit(true);
    if (event.key === "Escape") completeEdit(false);
  });
}

function handleFormSubmit(event) {
  event.preventDefault();
  addTodo(refs.todoInput.value);
  refs.todoInput.value = "";
  refs.todoInput.focus();
}

refs.todoForm.addEventListener("submit", handleFormSubmit);
refs.filterButtons.forEach((button) => {
  button.addEventListener("click", () => setFilter(button.dataset.filter));
});

if (refs.clearCompletedBtn) {
  refs.clearCompletedBtn.addEventListener("click", clearCompleted);
}

if (refs.markAllBtn) {
  refs.markAllBtn.addEventListener("click", markAllCompleted);
}

refs.todoInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") refs.todoInput.value = "";
});

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) {
    loadTodos();
    render();
  }
});

loadTodos();
updateFilterButtons();
render();
