"use strict";

console.log("Script iniciado");

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

async function keepAudioContextAlive() {
    await ensureAudioContext();
    if (audioCtx) {
        const silentOscillator = audioCtx.createOscillator();
        const silentGain = audioCtx.createGain();
        silentGain.gain.setValueAtTime(0, audioCtx.currentTime);
        silentOscillator.connect(silentGain).connect(audioCtx.destination);
        silentOscillator.start();
        silentOscillator.stop(audioCtx.currentTime + 0.01);
        console.log("Mantendo AudioContext ativo.");
    }
}

setInterval(keepAudioContextAlive, 10000);

let audioCtx;
let oscillator = null;
let gainNode = null;
let correctFrequencies = [], selectedFrequencies = [], selectedButton = null, sequenceFrequencies = [];
let isPlaying = false;
const timeoutIds = {};
let exerciseType = 'sequencia'; // Pode ser 'tons' ou 'sequencia'

function getRandomFrequency() {
    const min = window.MIN_FREQUENCY || 3000;
    const max = window.MAX_FREQUENCY || 8000;
    const frequency = Math.floor(Math.random() * (max - min)) + min;
    console.log(`Frequência gerada: ${frequency}`);
    return frequency;
}


function isFrequencyValid(newFrequency, frequencies, minDistance) {
    return frequencies.every(freq => Math.abs(newFrequency - freq) >= minDistance);
}

async function initOscillator(frequency) {
    //console.log("Iniciando oscilador...");
    await ensureAudioContext();
    if (oscillator) {
        oscillator.stop();
        oscillator.disconnect();
        //console.log("Oscilador anterior parado e desconectado.");
    }
    if (gainNode) gainNode.disconnect();

    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    //console.log(`Oscilador inicializado para frequência: ${frequency}`);
}

async function playWhistleSound(frequency, duration = 500) {
    //console.log("Tentando tocar som...");
    await ensureAudioContext();
    await initOscillator(frequency);

    setTimeout(() => {
        if (oscillator) oscillator.stop();
        if (gainNode) gainNode.disconnect();
        //console.log("Oscilador e GainNode desconectados após reprodução.");
    }, duration);

    console.log(`Som tocado: ${frequency} Hz por ${duration}ms`);
}

function generateFrequencyList(count, existingFrequencies = [], minDistance = 0) {
    const frequencies = [];
    for (let i = 0; i < count; i++) {
        let attempts = 0, randomFrequency;
        do {
            randomFrequency = getRandomFrequency();
            attempts++;
            if (attempts > 50) {
                console.error("Erro ao gerar frequência válida.");
                randomFrequency = (frequencies.length > 0 ? frequencies[frequencies.length - 1] : window.MIN_FREQUENCY) + minDistance;
                break;
            }
        } while (!isFrequencyValid(randomFrequency, [...frequencies, ...existingFrequencies], minDistance));
        frequencies.push(randomFrequency);
    }
    return frequencies;
}


async function playSequence(tones, delay) {
    if (isPlaying) {
        console.log("Já está tocando uma sequência. Ignorando nova interação.");
        return;
    }

    isPlaying = true;
    disableButtons(true);

    await new Promise(resolve => setTimeout(resolve, 100)); // Adicionar um pequeno atraso antes de começar a tocar a sequência

    for (let index = 0; index < tones.length; index++) {
        await playWhistleSound(tones[index]);
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    isPlaying = false;
    disableButtons(false);
    console.log("Sequência finalizada.");
}

function disableButtons(disable) {
    document.querySelectorAll('a').forEach(button => {
        button.disabled = disable;
        button.style.pointerEvents = disable ? 'none' : 'auto';
        button.style.opacity = disable ? '0.5' : '1';
        //console.log(`Botão ${button.id} ${disable ? 'desabilitado' : 'habilitado'}`);
    });

    const averiguarButton = document.getElementById('btnAveriguar');
    if (disable || !selectedButton) {
        averiguarButton.disabled = true;
        averiguarButton.style.pointerEvents = 'none';
        averiguarButton.style.opacity = '0.5';
    } else {
        averiguarButton.disabled = false;
        averiguarButton.style.pointerEvents = 'auto';
        averiguarButton.style.opacity = '1';
    }
}

function setupExercise() {
    $(document).ready(() => {
        correctFrequencies = generateFrequencyList(exerciseType === 'sequencia' ? 5 : 1);
        console.log("Frequências corretas:", correctFrequencies);

        sequenceFrequencies = Array.from({ length: 4 }, () => generateFrequencyList(exerciseType === 'sequencia' ? 5 : 1));
        const correctButtonIndex = Math.floor(Math.random() * 4);
        sequenceFrequencies[correctButtonIndex] = correctFrequencies;
        console.log("Frequências das sequências:", sequenceFrequencies);

        $('#btnApito').on('click', function(event) {
            event.preventDefault();
            console.log("btnApito clicado");
        });

        $('#btnApito').on('click', async function(event) {
            event.preventDefault();
            if (!isPlaying) {
                if (exerciseType === 'sequencia') {
                    await playSequence(correctFrequencies, window.DELAY);
                } else {
                    await playWhistleSound(correctFrequencies[0]);
                }
                //console.log("Botão Apito ativado.");
            } else {
                //console.log("btnApito clicado, mas já está tocando uma sequência.");
            }
        });

        for (let i = 1; i <= 4; i++) {
            $(`#btnSound${i}`).on('click', async function(event) {
                event.preventDefault();
                selectedFrequencies = sequenceFrequencies[i - 1];
                selectedButton = $(this);

                $('.buy-btn').removeClass('selected');
                $(this).addClass('selected');

                console.log(`Botão selecionado: ${this.id}`);
                if (!isPlaying) {
                    if (exerciseType === 'sequencia') {
                        await playSequence(selectedFrequencies, window.DELAY);
                    } else {
                        await playWhistleSound(selectedFrequencies[0]);
                    }
                    updateAveriguarButtonState();
                } else {
                    console.log(`${this.id} clicado, mas já está tocando uma sequência.`);
                }
            });
        }

        $('#btnAveriguar').on('click', function(event) {
            event.preventDefault();
            console.log("Clique no botão Averiguar detectado.");
            $('.buy-btn').removeClass('selected correct incorrect');

            if (selectedButton) {
                const isCorrect = JSON.stringify(selectedFrequencies) === JSON.stringify(correctFrequencies);
                selectedButton.addClass(isCorrect ? 'correct' : 'incorrect');
                console.log(`Resultado: ${selectedButton.attr('id')} está ${isCorrect ? 'correto' : 'incorreto'}`);

                timeoutIds[selectedButton.attr('id')] = setTimeout(() => {
                    selectedButton.removeClass('selected correct incorrect');
                    console.log("Timeout finalizado.");
                }, 500);
            } else {
                console.log("Nenhum botão selecionado.");
            }
        });

        updateAveriguarButtonState();
        console.log("Setup do exercício concluído.");
    });
}

function updateAveriguarButtonState() {
    const hasSelectedButton = !!$('.buy-btn.selected').length;
    const averiguarButton = document.getElementById('btnAveriguar');
    averiguarButton.disabled = !hasSelectedButton;
    averiguarButton.style.pointerEvents = hasSelectedButton ? 'auto' : 'none';
    averiguarButton.style.opacity = hasSelectedButton ? '1' : '0.5';
    //console.log(`Botão btnAveriguar ${hasSelectedButton ? 'habilitado' : 'desabilitado'}`);
}

function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        title: params.get('title'),
        description: params.get('description'),
        minFreq: +params.get('minFreq') || 3000,
        maxFreq: +params.get('maxFreq') || 8000,
        distancia: +params.get('distancia') || 500,
        delay: +params.get('delay') || 600,
        exerciseType: params.get('exerciseType') || 'tons' // Adicionei o parâmetro de tipo de exercício
    };
}
