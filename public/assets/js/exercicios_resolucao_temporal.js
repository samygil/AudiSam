"use strict";

console.log("Script iniciado");

let audioCtx;
let oscillator = null;
let gainNode = null;
let isPlaying = false;
let isPaused = false;
let isStopped = false;
let correctHighTonesCount; // Variável para armazenar a quantidade correta de tons agudos
let highTonesCount; // Variável para armazenar a quantidade de tons agudos gerados aleatoriamente

const timeoutIds = {};
const exerciseSpeed = 500; // Duração fixa de 0,5 segundo para cada tom
let pauseDuration = 500; // Pausa padrão entre os tons
let lowTonesCount = 10; // Quantidade de tons graves

const lowFrequency = 400; // Frequência fixa para tons graves
const highFrequency = 800; // Frequência fixa para tons agudos

document.addEventListener('click', async function initializeAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        console.log("AudioContext criado no evento de clique.");
    }
    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
        console.log("AudioContext ativado com interação inicial.");
    }
    document.removeEventListener('click', initializeAudioContext);
});

async function ensureAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        console.log("AudioContext criado no ensureAudioContext.");
    }
    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
        console.log("AudioContext reativado no ensureAudioContext.");
    }
}

async function initOscillator(frequency) {
    await ensureAudioContext();
    if (oscillator) {
        oscillator.stop();
        oscillator.disconnect();
    }
    if (gainNode) gainNode.disconnect();

    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
}

async function playTone(frequency, duration = exerciseSpeed) {
    await ensureAudioContext();
    await initOscillator(frequency);

    setTimeout(() => {
        if (oscillator) oscillator.stop();
        if (gainNode) gainNode.disconnect();
    }, duration);

    console.log(`Som tocado: ${frequency} Hz por ${duration}ms`);
}

async function playToneSequence(lowFrequency, highFrequency, lowCount, highCount) {
    if (isPlaying) {
        console.log("Já está tocando uma sequência. Ignorando nova interação.");
        return;
    }

    isPlaying = true;
    isPaused = false;
    isStopped = false;
    disableButtons(true);

    let sequence = [...Array(lowCount).fill(lowFrequency), ...Array(highCount).fill(highFrequency)];
    sequence.sort(() => Math.random() - 0.5); // Embaralha a sequência

    correctHighTonesCount = highCount; // Armazena a quantidade correta de tons agudos

    for (let frequency of sequence) {
        if (isStopped) break;
        while (isPaused) await new Promise(resolve => setTimeout(resolve, 100)); // Pausa ativa
        if (isStopped) break;

        await playTone(frequency);
        await new Promise(resolve => setTimeout(resolve, exerciseSpeed + pauseDuration)); // Tempo para tocar o tom e a pausa
    }

    isPlaying = false;
    disableButtons(false);
    console.log("Sequência finalizada.");
}

function togglePlayback() {
    const btnSound = document.getElementById('btnSound');
    if (btnSound) {
        if (isPaused) {
            isPaused = false;
            btnSound.classList.replace('bi-pause', 'bi-volume-up');
            console.log("Execução retomada.");
        } else {
            isPaused = true;
            btnSound.classList.replace('bi-volume-up', 'bi-pause');
            console.log("Execução pausada.");
        }
    } else {
        console.error('Botão de som não encontrado.');
    }
}

function stopPlayback() {
    const btnSound = document.getElementById('btnSound');
    if (btnSound) {
        isStopped = true;
        isPaused = false;
        disableButtons(false);
        btnSound.classList.replace('bi-pause', 'bi-volume-up');
        console.log("Execução parada.");
    } else {
        console.error('Botão de som não encontrado.');
    }
}

function disableButtons(disable) {
    document.querySelectorAll('a.buy-btn').forEach(button => {
        button.disabled = disable;
        button.style.pointerEvents = disable ? 'none' : 'auto';
        button.style.opacity = disable ? '0.5' : '1';
    });

    const averiguarButton = document.getElementById('btnAveriguar');
    averiguarButton.disabled = disable;
    averiguarButton.style.pointerEvents = disable ? 'none' : 'auto';
    averiguarButton.style.opacity = disable ? '0.5' : '1';
}

function setupExercise() {
    $(document).ready(() => {
        highTonesCount = Math.floor(Math.random() * 5) + 2; // Gera um número aleatório entre 2 e 6 para highTonesCount
        console.log(`Quantidade de tons agudos: ${highTonesCount}`);
        
        $('#btnSound').on('click', async function(event) {
            event.preventDefault();
            if (isPlaying) {
                togglePlayback();
            } else {
                document.getElementById('btnSound').classList.replace('bi-volume-up', 'bi-pause');
                await playToneSequence(lowFrequency, highFrequency, lowTonesCount, highTonesCount);
            }
        });

        $('#btnStop').on('click', function(event) {
            event.preventDefault();
            stopPlayback();
        });

        document.querySelectorAll('.buy-btn').forEach(button => {
            button.addEventListener('click', function() {
                const selectedCount = parseInt(this.textContent);
                if (selectedCount >= 1 && selectedCount <= 6) { // Verifica se o valor está entre 1 e 6
                    checkAnswer(selectedCount);
                } else {
                    console.error(`Valor inválido para a contagem: ${selectedCount}`);
                }
            });
        });

        document.querySelectorAll('#btnVelo1, #btnVelo2, #btnVelo3, #btnVelo4, #btnVelo5, #btnVelo6').forEach(button => {
            button.addEventListener('click', function() {
                const newPause = parseInt(this.id.replace('btnVelo', ''), 10);
                changePause(newPause);
            });
        });

        updateAveriguarButtonState();
        console.log("Setup do exercício concluído.");
    });
}

function changePause(newPause) {
    const pauseMapping = {
        1: 1000,
        2: 800,
        3: 600,
        4: 400,
        5: 200,
        6: 100
    };
    pauseDuration = pauseMapping[newPause];
    console.log(`Pausa alterada para: ${pauseDuration}ms`);
    misturarBotoes();
}

function checkAnswer(selectedCount) {
    const resultButton = document.getElementById(`btnSound${selectedCount}`);
    
    if (resultButton) { // Verifica se o botão existe antes de acessar `classList`
        const isCorrect = selectedCount === correctHighTonesCount;
        
        if (isCorrect) {
            resultButton.classList.add('correct');
            setTimeout(() => resultButton.classList.remove('correct'), 1000); // Remove a classe após 1 segundo
            console.log(`Resposta correta: ${selectedCount}`);
        } else {
            resultButton.classList.add('incorrect');
            setTimeout(() => resultButton.classList.remove('incorrect'), 1000); // Remove a classe após 1 segundo
            console.log(`Resposta incorreta: ${selectedCount}`);
        }
    } else {
        console.error(`Botão não encontrado para a contagem: ${selectedCount}`);
    }
}

function updateAveriguarButtonState() {
    const hasSelectedButton = !!$('.buy-btn.selected').length;
    const averiguarButton = document.getElementById('btnAveriguar');
    averiguarButton.disabled = !hasSelectedButton;
    averiguarButton.style.pointerEvents = hasSelectedButton ? 'auto' : 'none';
    averiguarButton.style.opacity = hasSelectedButton ? '1' : '0.5';
}

// Função para reiniciar os botões
function misturarBotoes() {
    const { title, description, minFreq, maxFreq, distancia, delay, exerciseType } = getUrlParams();
    loadExerciseContent(title, description, minFreq, maxFreq, distancia, delay, exerciseType);
    console.log('Exercício reiniciado');
}

// Função para obter os parâmetros da URL
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        title: params.get('title'),
        description: params.get('description'),
        minFreq: parseInt(params.get('minFreq'), 10) || 200,
        maxFreq: parseInt(params.get('maxFreq'), 10) || 500,
        distancia: parseInt(params.get('distancia'), 10) || 0,
        delay: parseInt(params.get('delay'), 10) || 600,
        exerciseType: params.get('exerciseType') || 'tons'
    };
}


document.getElementById('btnPause').addEventListener('click', function() {
    if (isPlaying) {
        isPaused = !isPaused; // Alterna entre pausar e continuar

        console.log(isPaused ? "Execução pausada." : "Execução retomada.");
    }
});