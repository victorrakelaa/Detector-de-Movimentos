// Elementos do DOM
const videoElement = document.getElementById('videoElement');
const canvasElement = document.getElementById('canvasElement');
const ctx = canvasElement.getContext('2d');
const statusText = document.getElementById('statusText');
const movementIndicator = document.getElementById('movementIndicator');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');

let stream = null;
let previousFrame = null;
let detectionInterval = null;
let isDetecting = false;

// Configuração do MediaPipe
const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});
hands.setOptions({
    maxNumHands: 2,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5
});

// Configurações
const sensitivity = 50; // Limiar para considerar movimento (0-255)
const detectionIntervalMs = 50; // Reduzir o intervalo para 50ms

/**
 * Inicia o acesso à webcam
 */
async function startWebcam() {
    try {
        console.log("Tentando acessar a webcam...");
        statusText.textContent = 'Acessando webcam...';
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        console.log("Webcam acessada com sucesso.");
        console.log("Atribuindo stream de vídeo ao elemento...");
        videoElement.srcObject = stream;
        console.log("Stream de vídeo atribuído com sucesso.");
        statusText.textContent = 'Webcam ativa. Clique em "Iniciar Detecção".';
    } catch (err) {
        console.error("Erro ao acessar a webcam: ", err);
        statusText.textContent = 'Erro ao acessar a webcam: ' + err.message;
    }
}

/**
 * Para o acesso à webcam e limpa os recursos
 */
function stopWebcam() {
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        stream = null;
    }
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
    }
    isDetecting = false;
    previousFrame = null;
    statusText.textContent = 'Webcam parada.';
    movementIndicator.classList.remove('movement-detected');
}

/**
 * Captura um frame da webcam e o converte para uma imagem processável
 * @returns {ImageData} Dados do frame capturado
 */
function captureFrame() {
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    return ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
}

/**
 * Converte um frame para escala de cinza
 * @param {ImageData} frameData Dados do frame
 * @returns {Uint8ClampedArray} Dados em escala de cinza
 */
function grayscale(frameData) {
    const data = frameData.data;
    const grayData = new Uint8ClampedArray(frameData.width * frameData.height);
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Fórmula de luminosidade para converter para cinza
        const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        grayData[i / 4] = gray;
    }
    return grayData;
}

/**
 * Função para desenhar as mãos
 */
function drawHands(handLandmarks) {
    ctx.fillStyle = 'red';
    handLandmarks.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x * canvasElement.width, point.y * canvasElement.height, 5, 0, 2 * Math.PI);
        ctx.fill();
    });
}

/**
 * Contar dedos levantados
 */
function countFingers(handLandmarks) {
    let count = 0;
    // Implementar lógica para contar dedos com base nas landmarks
    return count;
}

/**
 * Detecta movimento comparando o frame atual com o frame anterior
 */
async function detectMovement() {
    if (!isDetecting) {
        console.log("Detecção não iniciada.");
        return;
    }
    console.log("Iniciando detecção de movimento...");

    // Detecção de mãos
    console.log("Enviando imagem para detecção de mãos...");
    const results = await hands.send({ image: videoElement });
    console.log("Resultados da detecção de mãos:", results);
    if (results.multiHandLandmarks) {
        results.multiHandLandmarks.forEach(handLandmarks => {
            // Desenhar as mãos
            drawHands(handLandmarks);
            // Contar dedos levantados
            const fingersUp = countFingers(handLandmarks);
            statusText.textContent = `Dedos levantados: ${fingersUp}`;
        });
    }

    const currentFrame = captureFrame();
    const currentGray = grayscale(currentFrame);
    
    if (previousFrame) {
        let diffCount = 0;
        const totalPixels = currentGray.length;
        
        for (let i = 0; i < totalPixels; i++) {
            const diff = Math.abs(currentGray[i] - previousFrame[i]);
            if (diff > sensitivity) {
                diffCount++;
            }
        }
        
        // Se uma porcentagem significativa de pixels mudou, considera movimento
        const movementPercentage = (diffCount / totalPixels) * 100;
        if (movementPercentage > 2.0) { // 2% dos pixels mudaram
            statusText.textContent = `Movimento detectado! (${movementPercentage.toFixed(2)}% de diferença)`;
            movementIndicator.classList.add('movement-detected');
        } else {
            statusText.textContent = 'Nenhum movimento significativo detectado.';
            movementIndicator.classList.remove('movement-detected');
        }
    }
    
    previousFrame = currentGray;
}

/**
 * Inicia a detecção de movimento
 */
function startDetection() {
    if (!stream) {
        statusText.textContent = 'Por favor, inicie a webcam primeiro.';
        return;
    }
    
    if (isDetecting) {
        statusText.textContent = 'Detecção já em andamento.';
        return;
    }
    
    isDetecting = true;
    statusText.textContent = 'Iniciando detecção de movimento...';
    // Inicia o loop de detecção
    detectionInterval = setInterval(detectMovement, detectionIntervalMs);
}

/**
 * Para a detecção de movimento
 */
function stopDetection() {
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
    }
    isDetecting = false;
    previousFrame = null;
    statusText.textContent = 'Detecção parada.';
    movementIndicator.classList.remove('movement-detected');
}

// Event Listeners
startButton.addEventListener('click', startDetection);
stopButton.addEventListener('click', stopDetection);

// Inicia a webcam quando a página carrega
window.addEventListener('load', startWebcam);
