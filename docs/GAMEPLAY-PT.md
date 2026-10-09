# Guia de jogabilidade e design do sistema · v0.2

[English](GAMEPLAY-EN.md) · [简体中文](GAMEPLAY.md) · **Português** · [Español](GAMEPLAY-ES.md) · [日本語](GAMEPLAY-JA.md)

Este é o guia em português (pt-BR) das regras implementadas neste repositório: um simulador de trabalho de call center co-op online e jogo de festa de comédia sombria, com chamadores de IA fictícios, gestão de tempo, meta diária e avaliação de desempenho. As informações públicas sobre o jogo original confirmam o ciclo principal (chamadores de IA, um computador em janelas, escritório cooperativo, meta diária, loja, acidentes e avaliações). A curva de sete dias, os prazos de entrega, os efeitos das melhorias, a escala do mapa e os parâmetros de física abaixo são design próprio desta versão web, **não regras ocultas do jogo original**. Veja as [notas de pesquisa](RESEARCH.md). O Handbook dentro do jogo e o botão "Como jogar" mostram o mesmo conteúdo.

> Projeto de fãs não oficial. Todos os chamadores, cartões, IDs de tarefa e dinheiro são fictícios. Nunca informe dados reais de pagamento.

## Como funciona uma partida

1. Comece o turno e encontre a mesa pessoal marcada em amarelo no escritório. Chegue perto e pressione **E** para sentar.
2. Atenda uma chamada no Telefone, perceba a personalidade do chamador, converse e obtenha um token de tarefa fictício.
3. Abra o aplicativo de negócio correspondente para verificar. Você só ganha dinheiro quando a tarefa é concluída; fazer o chamador ler um código não paga nada.
4. Compre software, equipamentos ou suprimentos conforme precisar. Software é instalado na hora; itens físicos chegam à área de entrega, então você precisa sair da mesa para buscá-los e usá-los pela mochila.
5. Quando ocorre um acidente, a verificação de tarefas fica em pausa até você consertá-lo. Uma queda de energia exige ir ao quadro elétrico na sala de descanso.
6. Ao atingir a meta diária, você pode pedir a avaliação de desempenho antecipada; a contagem regressiva também a ativa automaticamente. Passar leva ao próximo dia; não bater a meta encerra a partida.
7. São sete dias. Passar na avaliação final desbloqueia "Sobrevivente do Fim de Semana". Você pode ser recontratado para uma nova partida.

## O escritório e os controles

O mapa tem uma área de mesas, um corredor à direita, uma sala de descanso e uma sala de reunião de avaliação. A área de entrega fica atrás e à direita da área de mesas; o quadro elétrico fica à direita da sala de descanso. Quatro jogadores têm uma mesa cada, e ninguém pode sentar remotamente nem no computador de outra pessoa. As duas primeiras fileiras são colegas de fundo.

| Ação | Tecla / método |
| --- | --- |
| Mover, andar de lado | WASD; setas para cima/baixo andam para frente e para trás |
| Olhar ao redor | Segure e arraste o mouse, ou clique em "Travar / Soltar mouse"; setas esquerda/direita giram |
| Correr / pular | Shift / Espaço |
| Alternar primeira / terceira pessoa | C |
| Sentar, pegar, desembalar, reiniciar o quadro elétrico | Fique perto do alvo e pressione E |
| Levantar / sentar de novo | Tab; para sentar é preciso estar perto da sua própria mesa |
| Soltar / arremessar item na mão | Q / botão esquerdo do mouse |
| Acenar / tirar foto | J / P; o app Câmera também tira e baixa fotos |
| Mochila / Como jogar / Menu | I / H / Esc no escritório |
| Voz da equipe | Com a voz ativada, segure V ou o botão de falar na tela |

Telas estreitas ganham botões de direção na tela. Paredes e móveis bloqueiam o movimento; andar na diagonal não dá bônus de velocidade. Correr e pular gastam energia, que se recupera ao parar de correr. Toques curtos movem em passos pequenos.

Os personagens têm balanço dos braços ao andar, poses sentado e digitando, piscar, movimento labial ao falar, aceno e reações a impactos. A Câmera do escritório fica acima do monitor da sua mesa, voltada para o assento, e mostra as pessoas do mesmo mundo; ela permanece ali quando você sai. O volume da voz humana move a boca do avatar; respostas em texto disparam pequenos gestos de fala. As janelas de chamada dos NPCs usam retratos 2D animados e marcantes para diferenciá-los dos funcionários 3D, com legendas ou voz sintetizada movendo a boca. Isso não é captura facial precisa por fonema.

## Chamadas, confiança e ferramentas de negócio

Uma chamada toca por 25 segundos; perdê-la conta como falha. Após atender, a paciência base é `max(45, 115 − dia×3 − floor(risco/4))` segundos, mais 30 segundos com a cafeteira. Um acidente ativo drena 1 segundo extra de paciência por segundo. O chamador desliga quando a paciência acaba ou a confiança chega a zero.

O modo offline oferece três respostas prontas (paciente, profissional, bem-humorada); texto livre e voz exigem IA ativada. As aberturas de novas chamadas são geradas a partir do negócio atual, então uma chamada de verificação de cartão não começa mais com o livro-caixa do milho. Uma boa resposta soma 16 de confiança; uma ruim tira 18; o Livro de Roteiros Dourado soma 5 às boas respostas. Após três trocas positivas com confiança de pelo menos 55, o chamador entrega o token da tarefa.

Com IA configurada, texto livre ou fala reconhecida passa pelo servidor até um modelo real. O modelo devolve o diálogo e um julgamento positivo / neutro / negativo com base na persona, no histórico e na sua resposta. Uma máquina de estados decide confiança e verificação; o modelo não pode alterar a carteira, o progresso da meta nem os itens. Respostas neutras não avançam a tarefa, e respostas atrasadas nunca afetam uma chamada posterior. Falhas do serviço mostram o motivo e você pode voltar ao modo offline.

| App | Desbloqueio | Ganho base | Condição de conclusão |
| --- | --- | --- | --- |
| Identity | Dia 1 | $250 | Enviar o token GAME-ID revelado na chamada |
| Credit Card | Dia 1 | $400 | Verificar os tokens GAME-CARD, PIX e MOON em ordem |
| AnyViewer | Dia 2 | $400 | Conectar o PC simulado, escolher mission.txt e verificar o código da tarefa |
| Gift Cards | Dia 2 | $350 | Enviar o token de vale-presente GAME-GC |
| Charity | Dia 3 | $500 | Concluir a tarefa do jogo Moon Cat Fund |
| Corn Futures | Dia 4 | $650 | Concluir a tarefa do jogo de futuros de milho |
| Nobel Prize | Dia 5 | $800 | Concluir a tarefa do jogo Slacker Prize |
| Retirement Fund | Dia 6 | $1.000 | Concluir a tarefa do jogo Mars Retirement Plan |

Um código errado reduz a confiança, e uma mesma tarefa nunca pode ser paga duas vezes. Todo negócio é uma simulação local fictícia: sem pagamentos reais, sem coleta de dados financeiros reais e sem acesso remoto real.

Os Registros de Chamadores abrem no dia 3 com as preferências e o histórico de partidas de oito personagens: a professora aposentada Dorothy, o astronauta Miles, a atriz Shanice, o contador Franklin, a criadora Brittany, a jardineira Eleanor, o programador Damien e o dono de pet shop Oliver.

## Dinheiro e crescimento

Você começa com uma carteira de $80, uma bebida energética e um kit de reparo. Concluir uma tarefa soma à carteira, à meta pessoal de hoje e à renda total de negócios. A meta diária da equipe é a soma dos totais pessoais de todos os jogadores.

As compras só reduzem a carteira e nunca subtraem da meta já concluída. Ganhos e perdas no entretenimento Rainbit alteram apenas a carteira, não a meta nem a renda total; é um minijogo simplificado com fichas sem valor no mundo real. Passar ao próximo dia mantém carteira, inventário, equipamentos, pedidos e renda total, e zera a meta diária.

As Finanças guardam as últimas 60 transações com saldos e datas. Cinco conquistas cobrem o primeiro negócio, três negócios seguidos, a primeira compra, resolver um acidente e passar no dia 7; conquistas nunca dão moeda oculta. Uma falha quebra a sequência e soma 5 de risco (máximo 100). O risco cai 15 no dia seguinte e 10 quando um acidente é resolvido.

## Loja, entrega e itens

A Scamazon agrupa produtos por tipo. Software é instalado após o pagamento; itens físicos chegam à área de entrega após 5 segundos de jogo. Fique ao lado do seu pacote e pressione E para desembalar, depois use o item pelo Inventário. No co-op, os pedidos pertencem ao comprador e ninguém mais pode retirá-los. Você pode ter até oito pedidos e 99 de cada item. Melhorias permanentes não podem ser compradas duas vezes; consumíveis podem ser repostos.

| Item | Preço | Como obter | Efeito |
| --- | --- | --- | --- |
| Headset com cancelamento de ruído | $200 | Físico → instalar | +10 de confiança inicial nas chamadas seguintes |
| Malwarebits Pro | $350 | Software, instantâneo | Bloqueia automaticamente acidentes de vírus |
| Cafeteira perpétua | $450 | Físico → instalar | +30 segundos de paciência ao atender |
| Livro de Roteiros Dourado | $600 | Software, instantâneo | +5 de confiança em trocas positivas |
| Amplificador de desempenho | $900 | Software, instantâneo | ×1,2 de ganho por tarefa, na carteira e na meta |
| Planta de apoio emocional | $120 | Físico → instalar | Na hora −15 de risco, depois −2 por tarefa concluída |
| Escudo antimotim de atendimento ao cliente | $120 | Físico → equipar | Bloqueia a próxima batida e é consumido; recompre para equipar de novo |
| Ataque aéreo de confete | $6.000 | Físico → usar | Afasta itens soltos próximos, desequilibra jogadores próximos por 2 s, confete dura 5 s |
| Bebida energética | $60 | Físico → usar | Energia a 100, +25 s de paciência em chamada ativa (máx. 180); consome uma garrafa |
| Kit de reparo elétrico | $90 | Físico → usar | Perto do quadro, conserta uma queda de energia na hora; não é consumido se não houver queda ou local errado |
| Recarga de extintor | $180 | Físico → usar | Apaga um incêndio na hora; não é consumida se não houver incêndio |
| Bola de basquete do escritório | $45 | Físico → usar | Cria uma bola compartilhada que dá para pegar, arremessar e quicar; fica no inventário se o limite de itens do mundo for atingido |

Bolas, caixas e copos no chão podem ser pegos, carregados, soltos ou arremessados. Reagem à gravidade, ao quique no chão, ao atrito, à colisão horizontal com paredes e móveis e entre si. Um objeto rápido pode desequilibrar um jogador por um instante. As formas de colisão são simplificadas e não são a física ragdoll nem a colisão exata de malha do jogo original. As fotos são, por ora, PNGs para download, não fotos impressas arremessáveis.

## Os sete dias e os acidentes

| Dia | Meta | Tempo | Novo negócio / conteúdo | Acidente |
| --- | --- | --- | --- | --- |
| 1 | $600 | 6 min | Arquivo de identidade, verificação de cartão em três campos | Nenhum |
| 2 | $1.100 | 6 min | Área de trabalho remota, vales-presente | Vírus |
| 3 | $1.750 | 6 min | Moon Cat Fund, registros de clientes | Queda de energia |
| 4 | $2.200 | 6 min | Futuros de milho | Incêndio |
| 5 | $2.600 | 6 min | Slacker Prize | Batida policial |
| 6 | $3.200 | 6 min | Mars Retirement Plan | Queda de energia |
| 7 | $4.000 | 7 min | Avaliação final de todos os negócios | Batida policial |

Um acidente dispara uma vez quando restam menos de 62% do dia de trabalho. Um vírus é limpo em três etapas no Malwarebits. Uma queda de energia exige sair da cadeira até o quadro elétrico e pressionar E três vezes, ou usar um kit de reparo. Um incêndio pode ser apagado na hora com um extintor ou tratado no Centro de Segurança. Numa batida, equipe antes o escudo antimotim ou conclua uma limpeza de três etapas no Centro de Segurança. Os acidentes só pausam o progresso das tarefas; o relógio do dia continua correndo.

A avaliação mostra o total da equipe, as contribuições pessoais, o resultado de aprovado / demitido e trechos reais das chamadas da partida. O replay é fala sintetizada lendo texto salvo; a voz humana real não é armazenada nem reproduzida.

## Co-op, voz e progresso

De um a quatro jogadores entram com um código de sala. O anfitrião inicia, pede a avaliação antecipada e avança o dia; cada membro atende as próprias chamadas e gerencia a própria carteira e mochila. O servidor calcula movimento, colisão, itens, temporizadores e recompensas e os transmite; os clientes enviam apenas a direção e nunca enviam coordenadas ou ganhos confiáveis.

A voz humana é áudio WebRTC real e pede permissão do microfone antes de entrar. Apertar para falar com V é o padrão, com opção de microfone aberto. O volume cai com a distância por padrão e esse efeito pode ser desligado. A sinalização de voz é retransmitida apenas entre membros online da mesma sala que ativaram a voz. Sair da sala ou desconectar fecha as faixas e conexões. Sem TURN, usa-se STUN direto e algumas redes não conseguem conectar; com Cloudflare TURN configurado, são emitidas credenciais de retransmissão de curta duração.

## Notas sobre áudio e fala

O som começa desligado; ative-o na bandeja para ouvir os chamadores. Com o som mudo, a reprodução normal não solicita text-to-speech na nuvem. A entrada de voz dos NPCs depende do SpeechRecognition do navegador e a voz sintetizada depende das vozes do sistema. O texto reconhecido é colocado na caixa de texto por padrão e pode, opcionalmente, ser enviado assim que reconhecido. Navegadores sem reconhecimento de fala ainda podem jogar por texto. Isso não é o STT/TTS local nem a clonagem de voz do jogo original.

O progresso do modo solo, inventário, pedidos e conquistas são salvos automaticamente no local e podem ser exportados como JSON. As contas permitem cadastro, login e salvar / carregar manualmente em saves na nuvem D1, com verificação de conflito de versão ao salvar de dispositivos diferentes. Recarregar no modo solo reposiciona o personagem e os itens temporários do chão e regenera os pacotes dos pedidos em aberto. O mundo multijogador é persistido periodicamente por um Durable Object e reentrar na mesma sala restaura o estado do servidor; é independente dos saves solo.

O modo solo pausa em menus, diálogos e abas ocultas; o multijogador pausa apenas quando todos estão offline. Se o anfitrião desconectar, a função de anfitrião passa a um membro online. Uma sala iniciada não aceita novos membros, mas os existentes podem reconectar.

## Onde está implementado

- `src/game/engine.ts`: chamadas, economia, acidentes, pedidos, inventário, conquistas, validação de saves.
- `src/game/world.ts`: mapa caminhável, mesas, objetos, pegar, arremessar, colisão, entrega e uso de itens.
- `src/components/Office.tsx`, `avatar.ts`, `CallerPortrait.tsx`: mundo, movimento esquelético, expressões dos NPCs.
- `worker/dialogue.ts`, `useDialogue.ts`: chamadas reais de IA no servidor e proteção contra resultados atrasados.
- `rtcPeer.ts`, `useVoice.ts`, `worker/rtc.ts`: áudio WebRTC, apertar para falar, volume, credenciais TURN.
- `worker/room.ts`: estado autoritativo da sala, meta compartilhada, snapshots de física, sinalização de voz.
- As [notas de aceitação](ACCEPTANCE.md) separam testes automatizados, verificações em navegador real e itens que exigem credenciais reais de serviços.
