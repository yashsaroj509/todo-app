/* script.js - Toodle App
   - Add / edit / delete
   - Complete toggle
   - Filter: all / active / completed
   - Persistent via localStorage
*/

(() => {
  // DOM elements
  const form = document.getElementById('taskForm');
  const input = document.getElementById('taskInput');
  const list = document.getElementById('taskList');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const clearCompletedBtn = document.getElementById('clearCompleted');
  const countSpan = document.getElementById('count');

  // Storage key
  const STORAGE_KEY = 'toodle.tasks.v1';

  // State
  let tasks = []; // {id, title, completed, createdAt}
  let filter = 'all'; // all | active | completed

  // Utils
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);

  // Load from storage
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      tasks = raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to parse tasks from localStorage', e);
      tasks = [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  // Render
  function render() {
    // filter tasks
    const shown = tasks.filter(t => {
      if (filter === 'active') return !t.completed;
      if (filter === 'completed') return t.completed;
      return true;
    });

    // clear
    list.innerHTML = '';

    if (shown.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'task-item';
      empty.style.justifyContent = 'center';
      empty.style.color = 'var(--muted)';
      empty.textContent = 'No tasks yet — add something!';
      list.appendChild(empty);
    } else {
      shown.forEach(task => list.appendChild(renderTask(task)));
    }

    updateCount();
    updateFilterUI();
  }

  function updateCount() {
    const pending = tasks.filter(t => !t.completed).length;
    countSpan.textContent = `${pending} item${pending !== 1 ? 's' : ''} left`;
  }

  function updateFilterUI() {
    filterButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
      btn.setAttribute('aria-selected', btn.dataset.filter === filter ? 'true' : 'false');
    });
  }

  // Create task list item
  function renderTask(task) {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.completed ? ' completed' : '');
    li.dataset.id = task.id;

    // Checkbox
    const checkbox = document.createElement('button');
    checkbox.className = 'checkbox';
    checkbox.setAttribute('aria-label', task.completed ? 'Mark as active' : 'Mark as completed');
    checkbox.title = checkbox.getAttribute('aria-label');

    const checkmark = document.createElement('span');
    checkmark.className = 'checkmark';
    checkmark.innerHTML = '&#10003;';
    checkbox.appendChild(checkmark);

    // Body (title / edit input)
    const body = document.createElement('div');
    body.className = 'task-body';

    const title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = task.title;
    title.tabIndex = 0;
    title.setAttribute('role', 'textbox');
    title.setAttribute('aria-label', `Task: ${task.title}`);

    const editInput = document.createElement('input');
    editInput.className = 'edit-input';
    editInput.value = task.title;
    editInput.style.display = 'none';

    body.appendChild(title);
    body.appendChild(editInput);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'icon-btn';
    editBtn.title = 'Edit task';
    editBtn.innerHTML = '✎';
    editBtn.setAttribute('aria-label', 'Edit task');

    const delBtn = document.createElement('button');
    delBtn.className = 'icon-btn';
    delBtn.title = 'Delete task';
    delBtn.innerHTML = '🗑';
    delBtn.setAttribute('aria-label', 'Delete task');

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    // Assemble
    li.appendChild(checkbox);
    li.appendChild(body);
    li.appendChild(actions);

    // Event handlers
    // Toggle complete
    checkbox.addEventListener('click', () => {
      toggleComplete(task.id);
    });

    // Delete
    delBtn.addEventListener('click', () => {
      deleteTask(task.id);
    });

    // Edit: double click on title or click edit button
    function enterEditMode() {
      li.classList.add('editing');
      title.style.display = 'none';
      editInput.style.display = '';
      editInput.focus();
      // put caret to end
      editInput.setSelectionRange(editInput.value.length, editInput.value.length);
    }

    function exitEditMode(saveChange = false) {
      li.classList.remove('editing');
      editInput.style.display = 'none';
      title.style.display = '';
      if (saveChange) {
        const newVal = editInput.value.trim();
        if (newVal.length > 0 && newVal !== task.title) {
          updateTaskTitle(task.id, newVal);
        } else {
          // if empty, do not allow — revert to previous title
          editInput.value = task.title;
        }
      } else {
        editInput.value = task.title;
      }
    }

    title.addEventListener('dblclick', enterEditMode);
    editBtn.addEventListener('click', enterEditMode);

    // Save edit on Enter, cancel on Escape
    editInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        exitEditMode(true);
      } else if (e.key === 'Escape') {
        exitEditMode(false);
      }
    });

    // When input loses focus, save change
    editInput.addEventListener('blur', () => exitEditMode(true));

    // Allow single-click select and keyboard enter to start edit
    title.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') enterEditMode();
    });

    return li;
  }

  // Task operations
  function addTask(title) {
    const t = {
      id: uid(),
      title: title.trim(),
      completed: false,
      createdAt: Date.now()
    };
    tasks.unshift(t); // newest at top
    save();
    render();
  }

  function updateTaskTitle(id, newTitle) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    t.title = newTitle;
    save();
    render();
  }

  function toggleComplete(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    t.completed = !t.completed;
    save();
    render();
  }

  function deleteTask(id) {
    tasks = tasks.filter(x => x.id !== id);
    save();
    render();
  }

  function clearCompleted() {
    tasks = tasks.filter(x => !x.completed);
    save();
    render();
  }

  // Form submit
  form.addEventListener('submit', e => {
    e.preventDefault();
    const value = input.value.trim();
    if (!value) return;
    addTask(value);
    input.value = '';
    input.focus();
  });

  // Filters
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filter = btn.dataset.filter;
      render();
    });
  });

  // Clear completed
  clearCompletedBtn.addEventListener('click', () => {
    clearCompleted();
  });

  // Keyboard: Escape clears input if empty
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') input.value = '';
  });

  // Init
  function init() {
    load();
    render();
  }

  init();
})();
