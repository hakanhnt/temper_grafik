// Model parameters extracted from Python training
const SCALER_MEANS = [
    553.1319910514542, 567.5055928411633, 586.4653243847874, 605.771812080537, 
    622.6398210290828, 639.4630872483222, 646.3557046979865, 652.7740492170022, 
    653.2751677852349, 652.0335570469799, 652.0872483221476, 32.100671140939596, 
    31.498881431767337, 36.588366890380314, 7.165548098434004, 7.114093959731544, 
    8.429530201342281, 33.31543624161074
];

const SCALER_STDS = [
    12.115699923088147, 9.692559938470517, 6.205866555495527, 4.206292514360376, 
    4.4078969163581965, 2.2540745803686795, 4.920041412545591, 4.588229998710573, 
    4.55273705379746, 3.2757316051164906, 3.4263087002926, 3.6772685243437304, 
    4.213472968170449, 6.827412097268508, 2.2364428454923915, 2.7616668150657766, 
    9.29380373810777, 4.274298479780866
];

const COEFFICIENTS = [
    0.22936994235676933, 0.22936994235677322, 0.14949188846166384, 0.015236674197135053, 
    0.08686075797337395, -0.12373487739020311, -0.597020774478273, 0.09021867139741514, 
    -0.16123804515091458, 0.042949943449878986, -0.16465840206256516, -0.3704120473380897, 
    -0.141093097728457, -0.19051248227590661, -0.033398556912848196, -0.023247869997894764, 
    -0.04917150882449105, -0.28829202690350975
];

const INTERCEPT = 0.23011669459107476;

const FEATURE_NAMES = [
    'S', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 
    'AB1', 'AB2', 'AB3', 'UB1', 'UB2', 'UB3', 'shock_temp'
];

// Presets representing success and fail conditions
const PRESET_SUCCESS = {
    S: 550, T2: 565, T3: 585, T4: 605, T5: 630, T6: 640, T7: 645, T8: 650, T9: 650, T10: 650, T11: 650,
    AB1: 37, AB2: 31, AB3: 31,
    UB1: 8, UB2: 7, UB3: 8,
    shock_temp: 30
};

const PRESET_FAIL = {
    S: 600, T2: 605, T3: 610, T4: 620, T5: 620, T6: 630, T7: 630, T8: 635, T9: 640, T10: 650, T11: 650,
    AB1: 31, AB2: 45, AB3: 70,
    UB1: 10, UB2: 17, UB3: 55,
    shock_temp: 28
};

// Global App State
let uploadedData = null;
let tempChart = null;
let scatterChart = null;
let distributionChart = null;

document.addEventListener("DOMContentLoaded", () => {
    initDND();
    initFormListeners();
    initPresets();
    initMiniChart();
    runPrediction(); // Run initial prediction with default values
});

// Drag and Drop Logic
function initDND() {
    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("excel-file-input");
    const btnRemove = document.getElementById("btn-remove-file");

    dropZone.addEventListener("click", () => fileInput.click());

    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("drag-over");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("drag-over");
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("drag-over");
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    btnRemove.addEventListener("click", () => {
        uploadedData = null;
        fileInput.value = "";
        document.getElementById("file-info").style.display = "none";
        dropZone.style.display = "block";
        document.getElementById("stats-panel").style.display = "none";
        document.getElementById("data-visualization-section").style.display = "none";
        destroyAdvancedCharts();
    });
}

// Read Excel file
function handleFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[1] || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        
        processUploadedData(json, file.name);
    };
    reader.readAsArrayBuffer(file);
}

// Process data and populate dashboard
function processUploadedData(data, fileName) {
    // Validate required columns
    const firstRow = data[0];
    if (!firstRow || !("Kırılma" in firstRow)) {
        alert("Geçersiz Excel dosyası! 'Kırılma' kolonu bulunamadı. Lütfen AK0001C.xlsx dosyasının Sayfa2 isimli sayfasını yükleyin.");
        return;
    }

    uploadedData = data;

    // Show File info
    document.getElementById("file-name").textContent = fileName;
    document.getElementById("file-info").style.display = "flex";
    document.getElementById("drop-zone").style.display = "none";

    // Calculate stats
    const totalRows = data.length;
    const breakageCount = data.filter(row => row["Kırılma"] === 1).length;
    const breakageRate = ((breakageCount / totalRows) * 100).toFixed(1);

    document.getElementById("stat-total-rows").textContent = totalRows;
    document.getElementById("stat-breakage-rate").textContent = breakageRate + "%";
    document.getElementById("stats-panel").style.display = "block";

    // Show visual charts section
    document.getElementById("data-visualization-section").style.display = "grid";

    // Render large charts
    renderScatterChart(data);
    renderDistributionChart(data);
}

// Form logic and prediction trigger
function initFormListeners() {
    const inputs = document.querySelectorAll("#predictor-form input");
    inputs.forEach(input => {
        input.addEventListener("input", () => {
            runPrediction();
            updateMiniChart();
        });
    });
}

// Presets loading
function initPresets() {
    document.getElementById("preset-success").addEventListener("click", () => loadPreset(PRESET_SUCCESS));
    document.getElementById("preset-fail").addEventListener("click", () => loadPreset(PRESET_FAIL));
}

function loadPreset(preset) {
    Object.keys(preset).forEach(key => {
        const input = document.getElementById(key);
        if (input) {
            input.value = preset[key];
        }
    });
    runPrediction();
    updateMiniChart();
}

// Machine Learning Predictor Engine (Client-side Sigmoid Inference)
function runPrediction() {
    const inputs = [];
    
    // Gather feature inputs in correct order
    for (let i = 0; i < FEATURE_NAMES.length; i++) {
        const val = parseFloat(document.getElementById(FEATURE_NAMES[i]).value) || 0;
        inputs.push(val);
    }

    // Scale inputs: (x - mean) / std
    const scaledInputs = [];
    for (let i = 0; i < inputs.length; i++) {
        const scaled = (inputs[i] - SCALER_MEANS[i]) / SCALER_STDS[i];
        scaledInputs.push(scaled);
    }

    // Compute linear sum: w * x + b
    let score = INTERCEPT;
    for (let i = 0; i < scaledInputs.length; i++) {
        score += scaledInputs[i] * COEFFICIENTS[i];
    }

    // Sigmoid function: p = 1 / (1 + e^-z)
    const probability = 1 / (1 + Math.exp(-score));
    const probPercentage = Math.round(probability * 100);

    // Update circular progress gauge
    const progressCircle = document.getElementById("progress-circle");
    const probValue = document.getElementById("probability-value");
    probValue.textContent = probPercentage + "%";

    const statusBadge = document.getElementById("status-badge");
    const statusDesc = document.getElementById("status-desc");

    // Dynamic coloring based on probability threshold
    if (probability > 0.5) {
        progressCircle.style.background = `conic-gradient(var(--danger-color) ${probPercentage * 3.6}deg, rgba(255, 255, 255, 0.05) 0deg)`;
        progressCircle.style.boxShadow = "0 0 20px var(--danger-glow)";
        statusBadge.textContent = "Yüksek Kırılma Riski!";
        statusBadge.className = "status-badge status-danger";
        statusDesc.textContent = "Mevcut parametrelerle üretilen camın temperleme fırınından çıkarken kırılma olasılığı yüksektir. Sıcaklığı düşürün veya şoklama soğutmasını optimize edin.";
    } else {
        progressCircle.style.background = `conic-gradient(var(--success-color) ${probPercentage * 3.6}deg, rgba(255, 255, 255, 0.05) 0deg)`;
        progressCircle.style.boxShadow = "0 0 20px var(--success-glow)";
        statusBadge.textContent = "Güvenli Çalışma Noktası";
        statusBadge.className = "status-badge status-safe";
        statusDesc.textContent = "Mevcut parametreler güvenli aralıktadır. Prosesin bu değerlerle sürdürülmesi önerilir.";
    }
}

// Chart.js Setup for Temperature Profile
function initMiniChart() {
    const ctx = document.getElementById("tempChart").getContext("2d");
    
    // Labels for furnace points
    const labels = ["S", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11"];
    const initialData = labels.map(label => parseFloat(document.getElementById(label).value) || 0);

    tempChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Fırın Sıcaklığı (°C)',
                data: initialData,
                borderColor: '#58a6ff',
                backgroundColor: 'rgba(88, 166, 255, 0.1)',
                tension: 0.3,
                fill: true,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(240, 246, 252, 0.05)' },
                    ticks: { color: '#8b949e', font: { family: 'Inter' } },
                    min: 500,
                    max: 700
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#8b949e', font: { family: 'Inter' } }
                }
            }
        }
    });
}

function updateMiniChart() {
    if (!tempChart) return;
    const labels = ["S", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11"];
    tempChart.data.datasets[0].data = labels.map(label => parseFloat(document.getElementById(label).value) || 0);
    tempChart.update('none'); // Update without animation for real-time smoothness
}

// Chart.js Scatter Plot for Pressures vs Breakage
function renderScatterChart(data) {
    const ctx = document.getElementById("scatterChart").getContext("2d");
    destroyChart(scatterChart);

    // Filter points by success / fail
    const successPoints = data.filter(row => row["Kırılma"] === 0).map(row => ({ x: row["AB1"], y: row["ÜB1"] }));
    const failPoints = data.filter(row => row["Kırılma"] === 1).map(row => ({ x: row["AB1"], y: row["ÜB1"] }));

    scatterChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Güvenli (Kırılmasız)',
                    data: successPoints,
                    backgroundColor: '#2ea44f',
                    pointRadius: 6
                },
                {
                    label: 'Riskli (Kırılmalı)',
                    data: failPoints,
                    backgroundColor: '#f85149',
                    pointRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#f0f6fc', font: { family: 'Inter' } }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Alt Basınç 1 (AB1 - bar)', color: '#8b949e' },
                    grid: { color: 'rgba(240, 246, 252, 0.05)' },
                    ticks: { color: '#8b949e' }
                },
                y: {
                    title: { display: true, text: 'Üst Basınç 1 (ÜB1 - bar)', color: '#8b949e' },
                    grid: { color: 'rgba(240, 246, 252, 0.05)' },
                    ticks: { color: '#8b949e' }
                }
            }
        }
    });
}

// Chart.js Bar Chart for Shocking Temperature Distribution
function renderDistributionChart(data) {
    const ctx = document.getElementById("distributionChart").getContext("2d");
    destroyChart(distributionChart);

    // Group breakage count by Shock Temperature
    const groups = {};
    data.forEach(row => {
        const t = row["Şoklama Hava Sıcaklığı"];
        if (!groups[t]) {
            groups[t] = { success: 0, fail: 0 };
        }
        if (row["Kırılma"] === 0) {
            groups[t].success++;
        } else {
            groups[t].fail++;
        }
    });

    const sortedTemps = Object.keys(groups).sort((a, b) => parseInt(a) - parseInt(b));
    const successData = sortedTemps.map(t => groups[t].success);
    const failData = sortedTemps.map(t => groups[t].fail);

    distributionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedTemps,
            datasets: [
                {
                    label: 'Kırılmasız',
                    data: successData,
                    backgroundColor: '#2ea44f'
                },
                {
                    label: 'Kırılmalı',
                    data: failData,
                    backgroundColor: '#f85149'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#f0f6fc', font: { family: 'Inter' } }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Şoklama Hava Sıcaklığı (°C)', color: '#8b949e' },
                    grid: { display: false },
                    ticks: { color: '#8b949e' },
                    stacked: true
                },
                y: {
                    title: { display: true, text: 'Gözlem Sayısı', color: '#8b949e' },
                    grid: { color: 'rgba(240, 246, 252, 0.05)' },
                    ticks: { color: '#8b949e' },
                    stacked: true
                }
            }
        }
    });
}

// Chart cleanup helpers
function destroyChart(chart) {
    if (chart) {
        chart.destroy();
    }
}

function destroyAdvancedCharts() {
    destroyChart(scatterChart);
    destroyChart(distributionChart);
    scatterChart = null;
    distributionChart = null;
}
