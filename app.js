

const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot');
const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const path = require('path');
const fs = require('fs');
const chat = require("./chatgpt.js");
const { handlerAI } = require('./whisper.js');
const MockAdapter = require('@bot-whatsapp/database/mock');
require("dotenv").config();

const menupath = path.join(__dirname, 'mensajes', 'menu.txt');
const menu = fs.readFileSync(menupath, 'utf-8');
const promptasistenciaPath = path.join(__dirname, 'mensajes', 'promptasistencia.txt');
const promptasistencia = fs.readFileSync(promptasistenciaPath, 'utf-8');

// Función para procesar la imagen
function procesarImagen(imagen) {
    // Lógica para procesar la imagen, por ejemplo, verificar el pago
    console.log('Procesando imagen:', imagen);
    // Realiza las verificaciones necesarias y actualiza el estado del pedido
}

// Flujos principales del bot
const flowPrincipal = addKeyword(['hola', 'ole', 'alo', 'buenas', 'buenas tardes', 'buenas noches', 'buenos dias', 'ola', 'hello'])
    .addAnswer('🙌 Hola, sea cordialmente bienvenido a Cavaniershop🙌')
    .addAnswer(['Escriba algunas de las opciones para seguir atendiéndolo:',
        '-->  Menu',
        '-->  Metodo de Pagos',
        '-->  Información del local'
    ]);

const flowMetodopago = addKeyword(['Pagos', 'Metodo de Pago', 'Metodo pago', 'Cuentas', 'Pagar', 'Forma de pago', 'quiero pagar', 'como pago', 'cuenta', 'datos'])
    .addAnswer('Métodos de pagos existentes')
    .addAnswer([
        'Pago Móvil: CI: 27602249, Teléfono: 04249693356 (Banco Mercantil preferido)',
        'PayPal: cleomigfonseca@outlook.com',
        'Zelle: cleomigfonseca@outlook.com',
        'Una vez realizado su pago, mande un capture y se le responderá si todo está correcto.'
    ]);

const flowImagenPago = addKeyword([EVENTS.IMAGE])
    .addAnswer('Hemos recibido tu Respuesta. Estamos verificando tu pago y pedido. Te responderemos pronto.')
    .addAction((ctx) => {
        procesarImagen(ctx.image);  // Procesar la imagen recibida
    });

const flowInformación = addKeyword(['Info', 'Información'])
    .addAnswer('Información del local')
    .addAnswer([
        'Teléfono: 4249693356',
        'Email: cleomigfonseca@gmail.com',
        'Dirección: San Félix el Roble Por Dentro Calle 1 De Mayo',
        'Horario: Lunes a domingo, de 6:30 pm a 9:30 pm',
        'Delivery: No disponible',
    ]);

const flowAsistencia = addKeyword([EVENTS.ACTION])
    .addAnswer("Este es el ChatGPT")
    .addAnswer("Haz tu pregunta", { capture: true }, async (ctx, { flowDynamic }) => {
        const prompt = promptasistencia; 
        const asistencia = ctx.body;
        const answer = await chat(prompt, asistencia); 
        await flowDynamic(answer.content); 
    });


const secondMenu = `
Menu y Lista de Precio:
1. Empanada de carne - $1.00
2. Empanada de queso - $1.00
3. Empanada de pollo - $1.50
4. Empanada Especial - $2.30
5. Empanada de pabellón - $2.00
6. Combo de 5 empanadas de pabellón - $6.00
7. Combo de 4 empanadas y refresco - $5.00
8. Combo de Empanada especial con calabresa y papas - $5.00
9. Combo de 6 empanadas especiales - $5.00
10. Pepsi - $1.00
11. Chinotto - $0.80
12. Coca-Cola - $0.80
13. Frescolita - $1.00
14. Nestea - $0.50

Para hacer su pedido, presione o copie este vínculo: [https://cleomig.github.io/proyecto/]

Escriba "0" para Retonar al menú principal.
`;

const flowSecondMenu = addKeyword(["menu1"])
    .addAnswer(secondMenu, { capture: true }, async (ctx, { gotoFlow, fallBack }) => {
        const validOptions = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "0"];
        if (!validOptions.includes(ctx.body)) {
            return fallBack("Respuesta no válida, por favor selecciona una de las opciones.");
        }
        switch (ctx.body) {
            case "1":
            case "2":
            case "3":
            case "4":
            case "5":
            case "6":
            case "7":
            case "8":
            case "9":
            case "10":
            case "11":
            case "12":
            case "13":
            case "14":
                return gotoFlow(menuFlow);
            case "20":
                return gotoFlow(flowMetodopago);
            case "0":
                return gotoFlow(menuFlow);
        }
    });

const menuFlow = addKeyword(["Menu"])
    .addAnswer(menu, { capture: true }, async (ctx, { gotoFlow, fallBack }) => {
        const validOptions = ["1", "2", "3","4", "0"];
        if (!validOptions.includes(ctx.body)) {
            return fallBack("Respuesta no válida, por favor selecciona una de las opciones.");
        }
        switch (ctx.body) {
            case "1":
                return gotoFlow(flowSecondMenu);
            case "2":
                return gotoFlow(flowMetodopago);
            case "3":
                return gotoFlow(flowAsistencia);
            case "4":
                    return gotoFlow(flowInformación);    
            case "0":
                return gotoFlow(flowPrincipal);
        }
    });

// Integración de Whisper para conversión de voz a texto
const flowWhisper = addKeyword([EVENTS.VOICE_NOTE])
    .addAnswer("Hemos recibido tu mensaje de voz, un momento mientras lo procesamos.")
    .addAnswer({ capture: true }, async (ctx, { flowDynamic }) => {
        const text = await handlerAI(ctx);
        await flowDynamic(`Tu mensaje de voz ha sido transcrito: ${text}`);
    });

const main = async () => {
    const adapterDB = new MockAdapter();
    const adapterFlow = createFlow([
        flowPrincipal,
        menuFlow,
        flowMetodopago,
        flowInformación,
        flowSecondMenu,
        flowAsistencia,
        flowImagenPago,
        flowWhisper
    ]);
    const adapterProvider = createProvider(BaileysProvider);

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });

    QRPortalWeb();
}

main();
