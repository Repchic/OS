const windowsLayer = document.getElementById("windows");
const startMenu = document.getElementById("startMenu");
const quickPanel = document.getElementById("quickPanel");
const taskbarApps = document.getElementById("taskbarApps");
const windowTemplate = document.getElementById("windowTemplate");
const desktop = document.getElementById("desktop");

const state = {
  zIndex: 10,
  windows: new Map(),
  fs: null,
  theme: {
    accent: "#5b8dff",
    mode: "dark",
  },
};

const apps = {
  explorer: { title: "Файловый менеджер" },
  browser: { title: "NOVA Browser" },
  games: { title: "Game Center" },
  notepad: { title: "Notepad" },
  settings: { title: "Настройки" },
  pulse: { title: "Pulse Center" },
  about: { title: "О системе" },
};

const defaultFS = {
  name: "root",
  type: "folder",
  items: [
    { name: "Документы", type: "folder", items: [] },
    { name: "Музыка", type: "folder", items: [] },
    { name: "Welcome.txt", type: "file", content: "Добро пожаловать в Windows 12 Nova!" },
  ],
};

const loadFS = () => {
  const stored = localStorage.getItem("nova_fs");
  state.fs = stored ? JSON.parse(stored) : defaultFS;
};

const saveFS = () => {
  localStorage.setItem("nova_fs", JSON.stringify(state.fs));
};

const updateClock = () => {
  const now = new Date();
  document.getElementById("clock").innerText = `${now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}\n${now.toLocaleDateString()}`;
};

const bringToFront = (win) => {
  state.zIndex += 1;
  win.style.zIndex = state.zIndex;
};

const createWindow = (appId, options = {}) => {
  const windowNode = windowTemplate.content.firstElementChild.cloneNode(true);
  const titleNode = windowNode.querySelector(".window-title");
  const contentNode = windowNode.querySelector(".window-content");
  titleNode.textContent = apps[appId]?.title ?? "Window";
  windowNode.style.left = `${80 + Math.random() * 200}px`;
  windowNode.style.top = `${60 + Math.random() * 120}px`;
  windowNode.style.zIndex = state.zIndex + 1;
  windowNode.dataset.app = appId;
  state.zIndex += 1;

  const taskbarButton = document.createElement("button");
  taskbarButton.className = "taskbar-app";
  taskbarButton.textContent = apps[appId]?.title ?? appId;
  taskbarApps.appendChild(taskbarButton);

  const setContent = (node) => {
    contentNode.innerHTML = "";
    contentNode.appendChild(node);
  };

  const closeWindow = () => {
    windowNode.remove();
    taskbarButton.remove();
    state.windows.delete(windowNode);
  };

  const toggleMinimize = () => {
    windowNode.classList.toggle("hidden");
  };

  const toggleMaximize = () => {
    windowNode.classList.toggle("maximized");
    if (windowNode.classList.contains("maximized")) {
      windowNode.dataset.prev = JSON.stringify({
        left: windowNode.style.left,
        top: windowNode.style.top,
        width: windowNode.style.width,
        height: windowNode.style.height,
      });
      windowNode.style.left = "0";
      windowNode.style.top = "0";
      windowNode.style.width = "100%";
      windowNode.style.height = "100%";
    } else {
      const prev = JSON.parse(windowNode.dataset.prev || "{}");
      windowNode.style.left = prev.left || "80px";
      windowNode.style.top = prev.top || "80px";
      windowNode.style.width = prev.width || "560px";
      windowNode.style.height = prev.height || "360px";
    }
  };

  windowNode.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const action = button.dataset.action;
      if (action === "close") closeWindow();
      if (action === "minimize") toggleMinimize();
      if (action === "maximize") toggleMaximize();
      if (action === "snap-left") snapWindow("left");
      if (action === "snap-right") snapWindow("right");
    });
  });

  taskbarButton.addEventListener("click", () => {
    if (windowNode.classList.contains("hidden")) {
      windowNode.classList.remove("hidden");
    }
    bringToFront(windowNode);
  });

  const header = windowNode.querySelector(".window-header");
  let offsetX = 0;
  let offsetY = 0;
  let isDragging = false;

  header.addEventListener("mousedown", (event) => {
    if (event.target.closest("button")) return;
    isDragging = true;
    offsetX = event.clientX - windowNode.offsetLeft;
    offsetY = event.clientY - windowNode.offsetTop;
    bringToFront(windowNode);
  });

  window.addEventListener("mousemove", (event) => {
    if (!isDragging) return;
    windowNode.style.left = `${event.clientX - offsetX}px`;
    windowNode.style.top = `${event.clientY - offsetY}px`;
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
  });

  const snapWindow = (side) => {
    windowNode.classList.remove("maximized");
    windowNode.style.top = "0";
    windowNode.style.height = "100%";
    windowNode.style.width = "50%";
    windowNode.style.left = side === "left" ? "0" : "50%";
  };

  windowsLayer.appendChild(windowNode);
  state.windows.set(windowNode, { setContent });

  return { windowNode, setContent, closeWindow };
};

const createExplorer = () => {
  const wrapper = document.createElement("div");
  const toolbar = document.createElement("div");
  toolbar.className = "file-toolbar";

  const locationSelect = document.createElement("select");
  const newFileBtn = document.createElement("button");
  newFileBtn.textContent = "Новый файл";
  const newFolderBtn = document.createElement("button");
  newFolderBtn.textContent = "Новая папка";
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Удалить";
  const renameBtn = document.createElement("button");
  renameBtn.textContent = "Переименовать";

  toolbar.append(locationSelect, newFileBtn, newFolderBtn, renameBtn, deleteBtn);

  const grid = document.createElement("div");
  grid.className = "file-grid";

  let current = state.fs;
  let selected = null;

  const refreshSelect = () => {
    const options = [state.fs, ...state.fs.items.filter((item) => item.type === "folder")];
    locationSelect.innerHTML = "";
    options.forEach((folder) => {
      const option = document.createElement("option");
      option.value = folder.name;
      option.textContent = folder.name;
      if (folder === current) option.selected = true;
      locationSelect.appendChild(option);
    });
  };

  const render = () => {
    refreshSelect();
    grid.innerHTML = "";
    current.items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "file-item";
      card.innerHTML = `<strong>${item.type === "folder" ? "📁" : "📄"}</strong><span>${item.name}</span>`;
      card.addEventListener("click", () => {
        grid.querySelectorAll(".file-item").forEach((el) => el.classList.remove("selected"));
        card.classList.add("selected");
        selected = item;
      });
      card.addEventListener("dblclick", () => {
        if (item.type === "folder") {
          current = item;
          selected = null;
          render();
        } else {
          openNotepad(item);
        }
      });
      grid.appendChild(card);
    });
  };

  locationSelect.addEventListener("change", () => {
    const target = state.fs.items.find((item) => item.name === locationSelect.value && item.type === "folder");
    if (target) {
      current = target;
      selected = null;
      render();
    }
  });

  newFileBtn.addEventListener("click", () => {
    const name = prompt("Имя файла", "Новый файл.txt");
    if (!name) return;
    current.items.push({ name, type: "file", content: "" });
    saveFS();
    render();
  });

  newFolderBtn.addEventListener("click", () => {
    const name = prompt("Имя папки", "Новая папка");
    if (!name) return;
    current.items.push({ name, type: "folder", items: [] });
    saveFS();
    render();
  });

  deleteBtn.addEventListener("click", () => {
    if (!selected) return;
    current.items = current.items.filter((item) => item !== selected);
    selected = null;
    saveFS();
    render();
  });

  renameBtn.addEventListener("click", () => {
    if (!selected) return;
    const name = prompt("Новое имя", selected.name);
    if (!name) return;
    selected.name = name;
    saveFS();
    render();
  });

  wrapper.append(toolbar, grid);
  render();
  return wrapper;
};

const openNotepad = (file) => {
  const { setContent } = createWindow("notepad");
  const container = document.createElement("div");
  const textarea = document.createElement("textarea");
  textarea.value = file?.content || "";
  textarea.style.width = "100%";
  textarea.style.height = "220px";
  textarea.style.background = "rgba(255,255,255,0.08)";
  textarea.style.border = "none";
  textarea.style.color = "var(--text)";
  textarea.style.padding = "12px";
  textarea.style.borderRadius = "12px";

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Сохранить";
  saveBtn.style.marginTop = "10px";
  saveBtn.className = "ghost";

  saveBtn.addEventListener("click", () => {
    if (file) {
      file.content = textarea.value;
    }
    saveFS();
    alert("Сохранено");
  });

  container.append(textarea, saveBtn);
  setContent(container);
};

const createBrowser = () => {
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.height = "100%";

  const bar = document.createElement("div");
  bar.className = "browser-bar";
  const input = document.createElement("input");
  input.value = "https://example.com";
  const goBtn = document.createElement("button");
  goBtn.textContent = "Открыть";
  goBtn.className = "ghost";

  bar.append(input, goBtn);

  const frame = document.createElement("iframe");
  frame.className = "browser-frame";
  frame.src = input.value;

  goBtn.addEventListener("click", () => {
    let url = input.value.trim();
    if (!url.startsWith("http")) {
      url = `https://${url}`;
    }
    frame.src = url;
  });

  wrapper.append(bar, frame);
  return wrapper;
};

const createGames = () => {
  const wrapper = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = "Nova Tic Tac Toe";
  const status = document.createElement("div");
  status.className = "notification";

  const board = document.createElement("div");
  board.className = "game-board";
  const cells = Array.from({ length: 9 }, () => "");
  let current = "X";

  const checkWinner = () => {
    const wins = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (const [a, b, c] of wins) {
      if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
        return cells[a];
      }
    }
    return cells.every(Boolean) ? "draw" : null;
  };

  const render = () => {
    board.innerHTML = "";
    cells.forEach((value, index) => {
      const cell = document.createElement("div");
      cell.className = "game-cell";
      cell.textContent = value;
      cell.addEventListener("click", () => {
        if (cells[index]) return;
        cells[index] = current;
        const winner = checkWinner();
        if (winner) {
          status.textContent = winner === "draw" ? "Ничья!" : `Победил ${winner}`;
        } else {
          current = current === "X" ? "O" : "X";
          status.textContent = `Ход: ${current}`;
        }
        render();
      });
      board.appendChild(cell);
    });
  };

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "Новая игра";
  resetBtn.className = "ghost";
  resetBtn.addEventListener("click", () => {
    cells.fill("");
    current = "X";
    status.textContent = "Ход: X";
    render();
  });

  status.textContent = "Ход: X";
  render();
  wrapper.append(title, status, board, resetBtn);
  return wrapper;
};

const createSettings = () => {
  const wrapper = document.createElement("div");
  wrapper.className = "settings-grid";

  const themeCard = document.createElement("div");
  themeCard.className = "settings-card";
  themeCard.innerHTML = `
    <h4>Внешний вид</h4>
    <p class="notification">Nova Theme Engine: динамические акценты и стеклянные панели.</p>
  `;

  const accentInput = document.createElement("input");
  accentInput.type = "color";
  accentInput.value = state.theme.accent;
  accentInput.addEventListener("input", () => {
    document.documentElement.style.setProperty("--accent", accentInput.value);
    state.theme.accent = accentInput.value;
    localStorage.setItem("nova_theme", JSON.stringify(state.theme));
  });

  themeCard.appendChild(accentInput);

  const featuresCard = document.createElement("div");
  featuresCard.className = "settings-card";
  featuresCard.innerHTML = `
    <h4>Новые фишки Windows 12</h4>
    <ul>
      <li>Pulse Center для мгновенной аналитики и управления режимами.</li>
      <li>NOVA Browser с быстрыми панелями и приватными зонами.</li>
      <li>Snap Layout 2.0: быстрый докинг окон по краям.</li>
      <li>Локальная песочница файлов с мгновенным поиском.</li>
    </ul>
  `;

  wrapper.append(themeCard, featuresCard);
  return wrapper;
};

const createPulse = () => {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <h3>Pulse Center</h3>
    <p class="notification">Единый центр производительности и персональных рекомендаций.</p>
    <div class="settings-grid">
      <div class="settings-card">
        <h4>Состояние системы</h4>
        <p>CPU Boost: 82%</p>
        <p>RAM Shield: 64%</p>
        <p>Nova AI: активен</p>
      </div>
      <div class="settings-card">
        <h4>Фокус-сессия</h4>
        <p>Предлагаем создать сценарий для работы и игр.</p>
        <button class="ghost">Запустить сценарий</button>
      </div>
    </div>
  `;
  return wrapper;
};

const createAbout = () => {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <h2>Windows 12 Nova Edition</h2>
    <p class="notification">Новая операционная система для браузера с живой экосистемой приложений.</p>
    <ul>
      <li>Многозадачность с оконным менеджером.</li>
      <li>Файловая система с локальным хранением.</li>
      <li>Встроенные игры и браузер.</li>
      <li>Быстрое развертывание на GitHub Pages.</li>
    </ul>
  `;
  return wrapper;
};

const openApp = (appId) => {
  const { setContent } = createWindow(appId);
  if (appId === "explorer") setContent(createExplorer());
  if (appId === "browser") setContent(createBrowser());
  if (appId === "games") setContent(createGames());
  if (appId === "settings") setContent(createSettings());
  if (appId === "pulse") setContent(createPulse());
  if (appId === "about") setContent(createAbout());
  if (appId === "notepad") setContent(document.createTextNode("Откройте файл через менеджер для редактирования."));
};

const initTheme = () => {
  const stored = localStorage.getItem("nova_theme");
  if (stored) state.theme = JSON.parse(stored);
  document.documentElement.style.setProperty("--accent", state.theme.accent);
};

const init = () => {
  loadFS();
  initTheme();
  updateClock();
  setInterval(updateClock, 1000);

  document.getElementById("startButton").addEventListener("click", () => {
    startMenu.classList.toggle("hidden");
    quickPanel.classList.add("hidden");
  });

  document.getElementById("quickButton").addEventListener("click", () => {
    quickPanel.classList.toggle("hidden");
    startMenu.classList.add("hidden");
  });

  document.getElementById("powerButton").addEventListener("click", () => {
    alert("Windows 12 Nova: режим сна активирован.");
  });

  desktop.querySelectorAll(".desktop-icon").forEach((icon) => {
    icon.addEventListener("dblclick", () => openApp(icon.dataset.app));
  });

  startMenu.querySelectorAll("button[data-app]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openApp(btn.dataset.app);
      startMenu.classList.add("hidden");
    });
  });

  document.addEventListener("click", (event) => {
    if (!startMenu.contains(event.target) && !event.target.closest("#startButton")) {
      startMenu.classList.add("hidden");
    }
    if (!quickPanel.contains(event.target) && !event.target.closest("#quickButton")) {
      quickPanel.classList.add("hidden");
    }
  });
};

init();
