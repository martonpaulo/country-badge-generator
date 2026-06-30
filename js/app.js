import {
  createCountryCatalog,
  normalizeSearch,
  searchCountries
} from "./countries.js";

import {
  fetchFlagSvg
} from "./flag-service.js";

import {
  createDeterministicPalette
} from "./palette.js";

import {
  copyText,
  createBadgeSvg,
  downloadSvg
} from "./svg.js";

const MAX_SUGGESTIONS = 8;

const elements = {
  input: document.querySelector("#country-search"),
  clearButton: document.querySelector("#clear-search"),
  countryOptions: document.querySelector("#country-options"),
  paletteOptions: document.querySelector("#palette-options"),
  paletteCountryCode: document.querySelector("#palette-country-code"),
  selectedCountry: document.querySelector("#selected-country"),
  selectedColor: document.querySelector("#selected-color"),
  selectedSwatch: document.querySelector("#selected-swatch"),
  outputName: document.querySelector("#output-name"),
  downloadButton: document.querySelector("#download-button"),
  copyButton: document.querySelector("#copy-button"),
  status: document.querySelector("#status-message"),
  preview: document.querySelector("#preview-canvas"),
  previewEmpty: document.querySelector("#preview-empty"),
  loadingState: document.querySelector("#loading-state")
};

const state = {
  catalog: createCountryCatalog(),
  countrySuggestions: [],
  activeSuggestionIndex: -1,
  selectedCountry: null,
  flagSvgText: "",
  palette: [],
  selectedPaletteIndex: 0,
  selectedSvg: "",
  outputFileName: "",
  requestId: 0,
  countryCache: new Map()
};

function setStatus(message, stateName = "") {
  elements.status.textContent = message;

  if (stateName) {
    elements.status.dataset.state = stateName;
  } else {
    delete elements.status.dataset.state;
  }
}

function setLoading(isLoading) {
  elements.loadingState.hidden = !isLoading;
  elements.loadingState.setAttribute(
    "aria-hidden",
    String(!isLoading)
  );

  elements.input.disabled = isLoading;
  elements.downloadButton.disabled =
    isLoading || !state.selectedSvg;
  elements.copyButton.disabled =
    isLoading || !state.selectedSvg;
}

function removeRenderedPreview() {
  elements.preview
    .querySelector(":scope > svg")
    ?.remove();
}

function resetGeneratedState() {
  state.flagSvgText = "";
  state.palette = [];
  state.selectedPaletteIndex = 0;
  state.selectedSvg = "";
  state.outputFileName = "";

  removeRenderedPreview();

  elements.previewEmpty.hidden = false;
  elements.paletteCountryCode.textContent = "—";
  elements.selectedColor.textContent = "—";
  elements.selectedSwatch.style.backgroundColor =
    "transparent";
  elements.outputName.textContent = "—";
  elements.downloadButton.disabled = true;
  elements.copyButton.disabled = true;

  renderEmptyPalette();
}

function renderEmptyPalette() {
  elements.paletteOptions.innerHTML = `
    <div class="palette-empty">
      Select a country to generate its three color options.
    </div>
  `;
}

function clearSelection({ focusInput = false } = {}) {
  state.requestId += 1;
  state.selectedCountry = null;
  state.activeSuggestionIndex = -1;

  elements.input.value = "";
  elements.selectedCountry.textContent = "None";
  elements.clearButton.hidden = true;

  closeCountrySuggestions();
  resetGeneratedState();
  setStatus("Choose a country to begin.");

  if (focusInput) {
    elements.input.focus();
  }
}

function openCountrySuggestions() {
  if (state.countrySuggestions.length === 0) {
    return;
  }

  elements.countryOptions.hidden = false;
  elements.input.setAttribute(
    "aria-expanded",
    "true"
  );
}

function closeCountrySuggestions() {
  elements.countryOptions.hidden = true;
  elements.input.setAttribute(
    "aria-expanded",
    "false"
  );
  elements.input.removeAttribute(
    "aria-activedescendant"
  );

  state.activeSuggestionIndex = -1;
}

function setActiveCountrySuggestion(index) {
  const options = [
    ...elements.countryOptions.querySelectorAll(
      '[role="option"]'
    )
  ];

  if (options.length === 0) {
    return;
  }

  state.activeSuggestionIndex = Math.max(
    0,
    Math.min(index, options.length - 1)
  );

  options.forEach((option, optionIndex) => {
    option.setAttribute(
      "aria-selected",
      String(
        optionIndex ===
          state.activeSuggestionIndex
      )
    );
  });

  const activeOption =
    options[state.activeSuggestionIndex];

  activeOption.scrollIntoView({
    block: "nearest"
  });

  elements.input.setAttribute(
    "aria-activedescendant",
    activeOption.id
  );
}

function renderCountrySuggestions() {
  elements.countryOptions.replaceChildren();

  if (state.countrySuggestions.length === 0) {
    closeCountrySuggestions();
    return;
  }

  const fragment =
    document.createDocumentFragment();

  state.countrySuggestions.forEach(
    (country, index) => {
      const option =
        document.createElement("li");

      const flag =
        document.createElement("span");

      const name =
        document.createElement("span");

      const code =
        document.createElement("span");

      option.id = `country-option-${country.code}`;
      option.className = "country-option";
      option.setAttribute("role", "option");
      option.setAttribute(
        "aria-selected",
        "false"
      );
      option.dataset.index = String(index);

      flag.className = "country-option-flag";
      flag.textContent = country.emoji;
      flag.setAttribute("aria-hidden", "true");

      name.className = "country-option-name";
      name.textContent = country.name;

      code.className = "country-option-code";
      code.textContent = country.code;

      option.append(flag, name, code);
      fragment.append(option);
    }
  );

  elements.countryOptions.append(fragment);
  openCountrySuggestions();
}

function updateCountrySuggestions() {
  state.countrySuggestions = searchCountries(
    state.catalog,
    elements.input.value,
    MAX_SUGGESTIONS
  );

  renderCountrySuggestions();
}

function renderPalette() {
  const fragment =
    document.createDocumentFragment();

  elements.paletteOptions.replaceChildren();

  state.palette.forEach((option, index) => {
    const button =
      document.createElement("button");

    const thumbnail =
      document.createElement("span");

    const meta =
      document.createElement("span");

    const label =
      document.createElement("span");

    const hex =
      document.createElement("span");

    button.type = "button";
    button.className = "palette-option";
    button.dataset.index = String(index);
    button.setAttribute(
      "aria-pressed",
      String(index === state.selectedPaletteIndex)
    );
    button.setAttribute(
      "aria-label",
      `${option.label}, ${option.hex}`
    );

    thumbnail.className = "palette-thumbnail";
    thumbnail.innerHTML = createBadgeSvg({
      code: state.selectedCountry.code,
      countryName: state.selectedCountry.name,
      flagSvgText: state.flagSvgText,
      backgroundHex: option.hex
    });

    meta.className = "palette-meta";

    label.className = "palette-label";
    label.textContent =
      index === 0
        ? `${option.label} · Recommended`
        : option.label;

    hex.className = "palette-hex";
    hex.textContent = option.hex;

    meta.append(label, hex);
    button.append(thumbnail, meta);
    fragment.append(button);
  });

  elements.paletteOptions.append(fragment);
}

function updateSelectedOption(index) {
  const option = state.palette[index];

  if (!option || !state.selectedCountry) {
    return;
  }

  state.selectedPaletteIndex = index;
  state.outputFileName =
    `${state.selectedCountry.code}.svg`;

  state.selectedSvg = createBadgeSvg({
    code: state.selectedCountry.code,
    countryName: state.selectedCountry.name,
    flagSvgText: state.flagSvgText,
    backgroundHex: option.hex
  });

  removeRenderedPreview();
  elements.previewEmpty.hidden = true;
  elements.preview.insertAdjacentHTML(
    "afterbegin",
    state.selectedSvg
  );

  elements.selectedColor.textContent =
    option.hex;

  elements.selectedSwatch.style.backgroundColor =
    option.hex;

  elements.outputName.textContent =
    state.outputFileName;

  elements.downloadButton.disabled = false;
  elements.copyButton.disabled = false;

  elements.paletteOptions
    .querySelectorAll(".palette-option")
    .forEach((button, buttonIndex) => {
      button.setAttribute(
        "aria-pressed",
        String(buttonIndex === index)
      );
    });

  setStatus(
    `${option.label} is selected.`,
    "success"
  );
}

async function loadCountryAssets(country) {
  const cached =
    state.countryCache.get(country.code);

  if (cached) {
    return cached;
  }

  const flagSvgText = await fetchFlagSvg(
    country.code
  );

  const palette =
    await createDeterministicPalette(
      flagSvgText
    );

  const assets = {
    flagSvgText,
    palette
  };

  state.countryCache.set(
    country.code,
    assets
  );

  return assets;
}

async function selectCountry(country) {
  const requestId = ++state.requestId;

  state.selectedCountry = country;
  state.selectedPaletteIndex = 0;

  elements.input.value = country.name;
  elements.selectedCountry.textContent =
    country.name;

  elements.paletteCountryCode.textContent =
    country.code;

  elements.clearButton.hidden = false;

  closeCountrySuggestions();
  resetGeneratedState();

  elements.selectedCountry.textContent =
    country.name;

  elements.paletteCountryCode.textContent =
    country.code;

  setLoading(true);
  setStatus(
    `Generating ${country.code} palette…`
  );

  try {
    const assets =
      await loadCountryAssets(country);

    if (requestId !== state.requestId) {
      return;
    }

    state.flagSvgText = assets.flagSvgText;
    state.palette = assets.palette;

    renderPalette();
    updateSelectedOption(0);

    setStatus(
      `${country.code} palette is ready.`,
      "success"
    );
  } catch (error) {
    if (requestId !== state.requestId) {
      return;
    }

    resetGeneratedState();

    elements.selectedCountry.textContent =
      country.name;

    elements.paletteCountryCode.textContent =
      country.code;

    setStatus(
      error instanceof Error
        ? error.message
        : "The palette could not be generated.",
      "error"
    );
  } finally {
    if (requestId === state.requestId) {
      setLoading(false);
      elements.input.focus();

      const cursorPosition =
        elements.input.value.length;

      elements.input.setSelectionRange(
        cursorPosition,
        cursorPosition
      );
    }
  }
}

function selectCountrySuggestion(index) {
  const country =
    state.countrySuggestions[index];

  if (country) {
    selectCountry(country);
  }
}

function handleCountryInput() {
  const normalizedInput =
    normalizeSearch(elements.input.value);

  const normalizedSelection =
    state.selectedCountry
      ? normalizeSearch(
          state.selectedCountry.name
        )
      : "";

  elements.clearButton.hidden =
    elements.input.value.length === 0;

  if (
    state.selectedCountry &&
    normalizedInput !== normalizedSelection
  ) {
    state.selectedCountry = null;
    elements.selectedCountry.textContent =
      "None";

    resetGeneratedState();
    setStatus(
      "Choose one of the country suggestions."
    );
  }

  updateCountrySuggestions();
}

function handleCountryKeydown(event) {
  if (event.key === "ArrowDown") {
    event.preventDefault();

    if (elements.countryOptions.hidden) {
      updateCountrySuggestions();
    }

    setActiveCountrySuggestion(
      state.activeSuggestionIndex + 1
    );
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();

    setActiveCountrySuggestion(
      state.activeSuggestionIndex <= 0
        ? state.countrySuggestions.length - 1
        : state.activeSuggestionIndex - 1
    );
    return;
  }

  if (
    event.key === "Enter" &&
    !elements.countryOptions.hidden &&
    state.activeSuggestionIndex >= 0
  ) {
    event.preventDefault();

    selectCountrySuggestion(
      state.activeSuggestionIndex
    );
    return;
  }

  if (event.key === "Escape") {
    closeCountrySuggestions();
  }
}

elements.input.addEventListener(
  "input",
  handleCountryInput
);

elements.input.addEventListener(
  "focus",
  () => {
    if (
      elements.input.value &&
      !state.selectedCountry
    ) {
      updateCountrySuggestions();
    }
  }
);

elements.input.addEventListener(
  "keydown",
  handleCountryKeydown
);

elements.clearButton.addEventListener(
  "click",
  () => {
    clearSelection({
      focusInput: true
    });
  }
);

elements.countryOptions.addEventListener(
  "pointerdown",
  event => {
    const option = event.target.closest(
      '[role="option"]'
    );

    if (!option) {
      return;
    }

    event.preventDefault();

    selectCountrySuggestion(
      Number(option.dataset.index)
    );
  }
);

elements.countryOptions.addEventListener(
  "pointermove",
  event => {
    const option = event.target.closest(
      '[role="option"]'
    );

    if (!option) {
      return;
    }

    setActiveCountrySuggestion(
      Number(option.dataset.index)
    );
  }
);

elements.paletteOptions.addEventListener(
  "click",
  event => {
    const option = event.target.closest(
      ".palette-option"
    );

    if (!option) {
      return;
    }

    updateSelectedOption(
      Number(option.dataset.index)
    );
  }
);

elements.downloadButton.addEventListener(
  "click",
  () => {
    if (
      !state.selectedSvg ||
      !state.outputFileName
    ) {
      return;
    }

    downloadSvg(
      state.outputFileName,
      state.selectedSvg
    );

    setStatus(
      `Downloaded ${state.outputFileName}.`,
      "success"
    );
  }
);

elements.copyButton.addEventListener(
  "click",
  async () => {
    if (!state.selectedSvg) {
      return;
    }

    try {
      await copyText(state.selectedSvg);

      setStatus(
        "SVG copied to the clipboard.",
        "success"
      );
    } catch {
      setStatus(
        "The SVG could not be copied in this browser.",
        "error"
      );
    }
  }
);

document.addEventListener(
  "pointerdown",
  event => {
    if (!event.target.closest(".combobox")) {
      closeCountrySuggestions();
    }
  }
);

clearSelection();
