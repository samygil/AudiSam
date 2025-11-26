"use strict";

console.log("Script iniciado");

// Defina as variáveis globalmente
var correctFrequency;
var selectedFrequency = null;
var selectedButton = null;
var frequencies = [];
var timeoutIds = {
    btnSound1: null,
    btnSound2: null,
    btnSound3: null,
    btnSound4: null
};

function getRandomFrequency() {
    const minFrequency = window.MIN_FREQUENCY || 3000;
    const maxFrequency = window.MAX_FREQUENCY || 8000;
    const randomFrequency = Math.floor(Math.random() * (maxFrequency - minFrequency)) + minFrequency;
    console.log(`Frequência gerada: ${randomFrequency}`);
    return randomFrequency;
}

function isFrequencyValid(newFrequency, frequencies, minDistance) {
    for (let frequency of frequencies) {
        if (Math.abs(newFrequency - frequency) < minDistance) {
            return false;
        }
    }
    return true;
}

function playWhistleSound(frequency) {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
            initOscillator(frequency);
        });
    } else {
        initOscillator(frequency);
    }

    setTimeout(() => {
        if (oscillator) {
            oscillator.stop();
            oscillator.disconnect();
        }
        if (gainNode) {
            gainNode.disconnect();
        }
        console.log("Oscilador e GainNode desconectados.");
    }, 500);

    console.log(`Som tocado: ${frequency} Hz`);
}

let audioCtx;
let oscillator = null;
let gainNode = null;

function initOscillator(frequency) {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (oscillator) {
        oscillator.stop();
        oscillator.disconnect();
    }
    if (gainNode) {
        gainNode.disconnect();
    }

    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
}

function setupExercise() {
    $(document).ready(function(){
        correctFrequency = getRandomFrequency();
        console.log(`Frequência correta: ${correctFrequency}`);

        frequencies = [];

        const correctButtonIndex = Math.floor(Math.random() * 4);
        const minDistance = window.FREQUENCY_DISTANCE || 500;
        const maxAttempts = 50;

        for (let i = 0; i < 4; i++) {
            if (i === correctButtonIndex) {
                frequencies.push(correctFrequency);
            } else {
                let randomFrequency;
                let attempts = 0;
                do {
                    randomFrequency = getRandomFrequency();
                    attempts++;
                    if (attempts > maxAttempts) {
                        console.error("Erro: não foi possível gerar uma frequência válida.");
                        randomFrequency = correctFrequency + (Math.random() < 0.5 ? -1 : 1) * minDistance;
                        break;
                    }
                } while (!isFrequencyValid(randomFrequency, frequencies, minDistance) || randomFrequency === correctFrequency);
                frequencies.push(randomFrequency);
            }
        }

        console.log("Frequências geradas:", frequencies);

        $('#btnApito').on('click touchstart', function(event) {
            event.preventDefault();
            playWhistleSound(correctFrequency);
            console.log("Frequência correta:", correctFrequency);
        });

        for (let i = 1; i <= 4; i++) {
            $(`#btnSound${i}`).on('click touchstart', function(event) {
                event.preventDefault();
                selectedFrequency = frequencies[i-1];
                selectedButton = $(this);

                $('.buy-btn').removeClass('selected');
                $(this).addClass('selected');

                if (selectedButton && selectedButton.attr('id')) {
                    console.log("Botão selecionado:", selectedButton.attr('id'));
                    playWhistleSound(selectedFrequency);
                    console.log("Frequência selecionada:", selectedFrequency);
                } else {
                    console.log("Falha ao selecionar o botão.");
                }
            });
        }

        $('#btnAveriguar').on('click touchstart', function(event) {
            event.preventDefault();
            Object.keys(timeoutIds).forEach(function(key) {
                if (timeoutIds[key]) {
                    clearTimeout(timeoutIds[key]);
                    timeoutIds[key] = null;
                }
            });

            $('.buy-btn').removeClass('selected correct incorrect');

            if (selectedButton && selectedButton.attr('id')) {
                const selectedButtonId = selectedButton.attr('id');
                console.log("Botão selecionado ao averiguar:", selectedButtonId);

                if (selectedFrequency === correctFrequency) {
                    selectedButton.addClass('correct');
                    console.log(`${selectedButtonId} está correto`);
                } else {
                    selectedButton.addClass('incorrect');
                    console.log(`${selectedButtonId} está incorreto`);
                }

                timeoutIds[selectedButtonId] = setTimeout(function() {
                    selectedButton.removeClass('selected correct incorrect');
                    console.log(`Timeout completo para: ${selectedButtonId}`);
                }, 500);

                console.log("Frequência selecionada ao averiguar:", selectedFrequency);
            } else {
                console.log("Nenhum botão foi selecionado.");
            }
        });

        console.log("Setup de exercício concluído");
    });
}

function misturarBotoes() {
    const { title, description, minFreq, maxFreq, distancia } = getUrlParams();
    loadExerciseContent(title, description, minFreq, maxFreq, distancia);
    console.log('Exercício reiniciado');
}

function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        title: params.get('title'),
        description: params.get('description'),
        minFreq: parseInt(params.get('minFreq'), 10) || 20,
        maxFreq: parseInt(params.get('maxFreq'), 10) || 8000,
        distancia: parseInt(params.get('distancia'), 10) || 500
    };
}

window.onload = function() {
    const { title, description, minFreq, maxFreq, distancia } = getUrlParams();
    loadExerciseContent(title, description, minFreq, maxFreq, distancia);

    document.getElementById('btnMisturar').addEventListener('click', misturarBotoes);
};
