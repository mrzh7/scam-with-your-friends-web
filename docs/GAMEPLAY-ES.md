# Guía de jugabilidad y diseño del sistema · v0.2

[English](GAMEPLAY-EN.md) · [简体中文](GAMEPLAY.md) · [Português](GAMEPLAY-PT.md) · **Español** · [日本語](GAMEPLAY-JA.md)

Esta es la guía en español de las reglas implementadas en este repositorio: un simulador de trabajo de centro de llamadas cooperativo en línea y juego de fiesta de comedia negra, con llamantes de IA ficticios, gestión del tiempo, cuota diaria y evaluación de desempeño. La información pública sobre el juego original confirma el bucle principal (llamantes de IA, un ordenador con ventanas, oficina cooperativa, cuota diaria, tienda, accidentes y evaluaciones). La curva de siete días, los tiempos de entrega, los efectos de las mejoras, la escala del mapa y los parámetros de física que siguen son diseño propio de esta versión web, **no reglas ocultas del juego original**. Consulta las [notas de investigación](RESEARCH.md). El Handbook dentro del juego y el botón «Cómo jugar» muestran el mismo material.

> Proyecto de fans no oficial. Todos los llamantes, tarjetas, ID de tarea y dinero son ficticios. Nunca introduzcas datos de pago reales.

## Cómo funciona una partida

1. Empieza el turno y busca tu escritorio personal marcado en amarillo en la oficina. Acércate y pulsa **E** para sentarte.
2. Contesta una llamada entrante en Teléfono, lee la personalidad del llamante, habla y consigue un token de tarea ficticio.
3. Abre la aplicación de negocio correspondiente para verificarlo. Solo ganas dinero cuando se completa la tarea; lograr que el llamante lea un código no paga nada.
4. Compra software, equipo o suministros según lo necesites. El software se instala al instante; los objetos físicos llegan a la zona de entrega, así que debes salir de tu escritorio para recogerlos y usarlos desde la mochila.
5. Cuando ocurre un accidente, la verificación de tareas se pausa hasta que lo arregles. Un apagón significa ir al cuadro eléctrico de la sala de descanso.
6. Al alcanzar la cuota diaria puedes pedir la evaluación de desempeño antes de tiempo; la cuenta atrás también la activa automáticamente. Superarla pasa al día siguiente; no llegar a la cuota termina la partida.
7. Hay siete días. Superar la evaluación final desbloquea «Superviviente del Fin de Semana». Puedes ser recontratado para una nueva partida.

## La oficina y los controles

El mapa tiene una zona de escritorios, un pasillo a la derecha, una sala de descanso y una sala de reuniones de evaluación. La zona de entrega está detrás y a la derecha de la zona de escritorios; el cuadro eléctrico está a la derecha de la sala de descanso. Cuatro jugadores tienen un escritorio cada uno, y nadie puede sentarse a distancia ni en el ordenador de otro. Las dos primeras filas son compañeros de ambiente.

| Acción | Tecla / método |
| --- | --- |
| Moverse, desplazarse lateralmente | WASD; las flechas arriba/abajo avanzan y retroceden |
| Mirar alrededor | Mantén pulsado y arrastra el ratón, o haz clic en «Bloquear / Liberar ratón»; las flechas izquierda/derecha giran |
| Correr / saltar | Shift / Espacio |
| Cambiar primera / tercera persona | C |
| Sentarse, recoger, desempaquetar, reiniciar el cuadro eléctrico | Colócate cerca del objetivo y pulsa E |
| Levantarse / volver a sentarse | Tab; para sentarte debes estar cerca de tu propio escritorio |
| Soltar / lanzar el objeto en mano | Q / botón izquierdo del ratón |
| Saludar / hacer una foto | J / P; la app Cámara también hace y descarga fotos |
| Mochila / Cómo jugar / Menú | I / H / Esc en la oficina |
| Voz de equipo | Con la voz activada, mantén V o el botón de hablar en pantalla |

Las pantallas estrechas muestran botones de dirección en pantalla. Las paredes y los muebles bloquean el movimiento; moverse en diagonal no da bonificación de velocidad. Correr y saltar consumen aguante, que se recupera al dejar de correr. Las pulsaciones cortas mueven en pasos pequeños.

Los personajes tienen balanceo de brazos al caminar, poses sentados y tecleando, parpadeo, movimiento de labios al hablar, saludo y reacciones a golpes. La Cámara de la oficina está sobre el monitor de tu escritorio, mira al asiento y muestra a las personas del mismo mundo; se queda allí cuando te vas. El volumen de la voz humana mueve la boca del avatar; las respuestas de texto activan breves gestos al hablar. Las ventanas de llamada de los NPC usan retratos 2D animados y marcados para distinguirlos de los empleados 3D, con subtítulos o voz sintetizada moviendo la boca. No es captura facial precisa a nivel de fonema.

## Llamadas, confianza y herramientas de negocio

Una llamada suena 25 segundos; perderla cuenta como fallo. Tras contestar, la paciencia base es `max(45, 115 − día×3 − floor(riesgo/4))` segundos, más 30 segundos con la cafetera. Un accidente activo drena 1 segundo extra de paciencia por segundo. El llamante cuelga cuando se acaba la paciencia o la confianza llega a cero.

El modo sin conexión ofrece tres respuestas predefinidas (paciente, profesional, humorística); el texto libre y la voz requieren IA activada. Las aperturas de las nuevas llamadas se generan a partir del negocio actual, así que una llamada de verificación de tarjeta ya no abre con el libro de cuentas del maíz. Una buena respuesta suma 16 de confianza; una mala resta 18; el Libro de Guiones Dorado suma 5 a las buenas respuestas. Tras tres intercambios positivos con confianza de al menos 55, el llamante entrega el token de tarea.

Con IA configurada, el texto libre o la voz reconocida pasa por el servidor a un modelo real. El modelo devuelve el diálogo y un juicio positivo / neutral / negativo según el personaje, el historial y tu respuesta. Una máquina de estados decide la confianza y la verificación; el modelo no puede cambiar la cartera, el progreso de la cuota ni los objetos. Las respuestas neutrales no avanzan la tarea y las respuestas obsoletas nunca afectan a una llamada posterior. Los fallos del servicio muestran el motivo y puedes volver al modo sin conexión.

| App | Se desbloquea | Ingreso base | Condición de finalización |
| --- | --- | --- | --- |
| Identity | Día 1 | $250 | Enviar el token GAME-ID revelado en la llamada |
| Credit Card | Día 1 | $400 | Verificar en orden los tokens GAME-CARD, PIX y MOON |
| AnyViewer | Día 2 | $400 | Conectar el PC simulado, elegir mission.txt y verificar el código de tarea |
| Gift Cards | Día 2 | $350 | Enviar el token de tarjeta regalo GAME-GC |
| Charity | Día 3 | $500 | Completar la tarea del juego Moon Cat Fund |
| Corn Futures | Día 4 | $650 | Completar la tarea del juego de futuros de maíz |
| Nobel Prize | Día 5 | $800 | Completar la tarea del juego Slacker Prize |
| Retirement Fund | Día 6 | $1,000 | Completar la tarea del juego Mars Retirement Plan |

Un código incorrecto reduce la confianza, y una tarea nunca puede liquidarse dos veces. Cada negocio es una simulación local ficticia: sin pagos reales, sin recopilación de datos financieros reales y sin acceso remoto real.

Los Registros de Llamantes se abren el día 3 con las preferencias y el historial de partidas de ocho personajes: la maestra jubilada Dorothy, el astronauta Miles, la actriz Shanice, el contable Franklin, la creadora Brittany, la jardinera Eleanor, el programador Damien y el dueño de una tienda de mascotas Oliver.

## Dinero y progreso

Empiezas con una cartera de $80, una bebida energética y un kit de reparación. Completar una tarea suma a la cartera, a la cuota personal de hoy y a los ingresos de negocio de toda la partida. La cuota diaria del equipo es la suma de los totales personales de todos los jugadores.

Las compras solo reducen la cartera y nunca restan de la cuota ya completada. Las ganancias y pérdidas del entretenimiento Rainbit solo cambian la cartera, no la cuota ni los ingresos totales; es un minijuego simplificado con fichas sin valor real. Pasar al día siguiente conserva la cartera, el inventario, el equipo, los pedidos y los ingresos totales, y reinicia la cuota diaria.

Finanzas guarda las últimas 60 transacciones con saldos y fechas. Cinco logros cubren el primer trato, tres tratos seguidos, la primera compra, resolver un accidente y superar el día 7; los logros nunca otorgan moneda oculta. Un fallo rompe la racha y suma 5 de riesgo (tope 100). El riesgo baja 15 al día siguiente y 10 al resolver un accidente.

## Tienda, entrega y objetos

Scamazon agrupa los productos por tipo. El software se instala tras el pago; los bienes físicos llegan a la zona de entrega tras 5 segundos de juego. Colócate junto a tu paquete y pulsa E para desempaquetar, y luego usa el objeto desde el Inventario. En cooperativo, los pedidos pertenecen al comprador y nadie más puede recogerlos. Puedes tener hasta ocho pedidos y 99 de cada objeto. Las mejoras permanentes no se pueden comprar dos veces; los consumibles se pueden reponer.

| Objeto | Precio | Cómo se obtiene | Efecto |
| --- | --- | --- | --- |
| Auriculares con cancelación de ruido | $200 | Físico → instalar | +10 de confianza inicial en llamadas posteriores |
| Malwarebits Pro | $350 | Software, instantáneo | Bloquea automáticamente los accidentes de virus |
| Cafetera perpetua | $450 | Físico → instalar | +30 segundos de paciencia al contestar |
| Libro de Guiones Dorado | $600 | Software, instantáneo | +5 de confianza en intercambios positivos |
| Amplificador de rendimiento | $900 | Software, instantáneo | ×1,2 de ingreso por tarea, en cartera y cuota |
| Planta de apoyo emocional | $120 | Físico → instalar | Al instante −15 de riesgo, luego −2 por tarea completada |
| Escudo antidisturbios de atención al cliente | $120 | Físico → equipar | Bloquea la próxima redada y se consume; vuelve a comprarlo para equiparlo otra vez |
| Ataque aéreo de confeti | $6,000 | Físico → usar | Aparta objetos sueltos cercanos, desequilibra a los jugadores cercanos 2 s, el confeti dura 5 s |
| Bebida energética | $60 | Físico → usar | Aguante a 100, +25 s de paciencia en una llamada activa (tope 180); se consume una botella |
| Kit de reparación eléctrica | $90 | Físico → usar | Cerca del cuadro, arregla un apagón al instante; no se consume si no hay apagón o estás en el lugar equivocado |
| Recarga de extintor | $180 | Físico → usar | Apaga un incendio al instante; no se consume si no hay incendio |
| Balón de baloncesto de oficina | $45 | Físico → usar | Genera un balón compartido que puedes recoger, lanzar y hacer botar; se queda en el inventario si se alcanza el límite de objetos del mundo |

Las pelotas, cajas y vasos del suelo se pueden recoger, llevar, soltar o lanzar. Reaccionan a la gravedad, al rebote en el suelo, a la fricción, a la colisión horizontal con paredes y muebles y entre sí. Un objeto rápido puede desequilibrar brevemente a un jugador. Las formas de colisión están simplificadas y no son la física ragdoll ni la colisión exacta de malla del juego original. Las fotos son por ahora PNG descargables, no fotos impresas que se puedan lanzar.

## Los siete días y los accidentes

| Día | Cuota | Tiempo | Nuevo negocio / contenido | Accidente |
| --- | --- | --- | --- | --- |
| 1 | $600 | 6 min | Expediente de identidad, verificación de tarjeta en tres campos | Ninguno |
| 2 | $1,100 | 6 min | Escritorio remoto, tarjetas regalo | Virus |
| 3 | $1,750 | 6 min | Moon Cat Fund, registros de clientes | Apagón |
| 4 | $2,200 | 6 min | Futuros de maíz | Incendio |
| 5 | $2,600 | 6 min | Slacker Prize | Redada |
| 6 | $3,200 | 6 min | Mars Retirement Plan | Apagón |
| 7 | $4,000 | 7 min | Evaluación final de todos los negocios | Redada |

Un accidente se activa una vez cuando queda menos del 62 % de la jornada. Un virus se limpia en tres pasos en Malwarebits. Un apagón exige levantarte hasta el cuadro eléctrico y pulsar E tres veces, o usar un kit de reparación. Un incendio se puede apagar al instante con un extintor o resolverse en el Centro de Seguridad. En una redada, equipa antes el escudo antidisturbios o completa una limpieza de tres pasos en el Centro de Seguridad. Los accidentes solo pausan el progreso de las tareas; el reloj de la jornada sigue corriendo.

La evaluación muestra el total del equipo, las contribuciones personales, un resultado de aprobado / despedido y fragmentos reales de llamadas de la partida. La repetición es voz sintetizada que lee texto guardado; la voz humana real no se almacena ni se reproduce.

## Cooperativo, voz y progreso

De uno a cuatro jugadores se unen con un código de sala. El anfitrión inicia, pide la evaluación anticipada y avanza el día; cada miembro contesta sus propias llamadas y gestiona su propia cartera y mochila. El servidor calcula el movimiento, las colisiones, los objetos, los temporizadores y las recompensas y los difunde; los clientes solo envían la dirección y nunca suben coordenadas ni ingresos de confianza.

La voz humana es audio WebRTC real y pide permiso de micrófono antes de unirse. Pulsar para hablar con V es lo predeterminado, con opción de micrófono abierto. El volumen baja con la distancia por defecto y esa opción se puede desactivar. La señalización de voz solo se retransmite entre miembros en línea de la misma sala que activaron la voz. Salir de la sala o desconectarse cierra las pistas y conexiones. Sin TURN se usa STUN directo y algunas redes no pueden conectar; con Cloudflare TURN configurado se emiten credenciales de retransmisión de corta duración.

## Notas de audio y voz

El sonido empieza desactivado; actívalo en la bandeja para oír a los llamantes. Con el sonido silenciado, la reproducción normal no solicita text-to-speech en la nube. La entrada de voz de los NPC depende del SpeechRecognition del navegador y la voz sintetizada depende de las voces del sistema. El texto reconocido se coloca por defecto en el cuadro de texto y opcionalmente puede enviarse en cuanto se reconoce. Los navegadores sin reconocimiento de voz pueden jugar con texto. No es el STT/TTS local ni la clonación de voz del juego original.

El progreso en solitario, el inventario, los pedidos y los logros se guardan automáticamente en local y se pueden exportar como JSON. Las cuentas permiten registrarse, iniciar sesión y guardar / cargar manualmente en partidas guardadas en la nube D1, con comprobación de conflictos de versión al guardar desde distintos dispositivos. Recargar en solitario recoloca al personaje y los objetos temporales del suelo y regenera los paquetes de los pedidos abiertos. El mundo multijugador lo persiste periódicamente un Durable Object y volver a entrar en la misma sala restaura el estado del servidor; es independiente de las partidas en solitario.

El modo en solitario se pausa en menús, diálogos y pestañas ocultas; el multijugador solo se pausa cuando todos están desconectados. Si el anfitrión se desconecta, el papel de anfitrión pasa a un miembro en línea. Una sala iniciada no admite nuevos miembros, pero los existentes pueden reconectarse.

## Dónde está implementado

- `src/game/engine.ts`: llamadas, economía, accidentes, pedidos, inventario, logros, validación de partidas guardadas.
- `src/game/world.ts`: mapa transitable, escritorios, objetos, recoger, lanzar, colisión, entrega y uso de objetos.
- `src/components/Office.tsx`, `avatar.ts`, `CallerPortrait.tsx`: mundo, movimiento esquelético, expresiones de los NPC.
- `worker/dialogue.ts`, `useDialogue.ts`: llamadas reales de IA en el servidor y protección contra resultados obsoletos.
- `rtcPeer.ts`, `useVoice.ts`, `worker/rtc.ts`: audio WebRTC, pulsar para hablar, volumen, credenciales TURN.
- `worker/room.ts`: estado autoritativo de la sala, cuota compartida, instantáneas de física, señalización de voz.
- Las [notas de aceptación](ACCEPTANCE.md) separan las pruebas automatizadas, las comprobaciones en navegador real y lo que requiere credenciales reales de servicios.
