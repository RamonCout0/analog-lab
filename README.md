# ANALOG//LAB — editor de fotos para Analog Horror

Um editor de fotos que roda direto no navegador, feito para dar aquele visual de **VHS, camcorder, câmera de segurança, found footage e TV de tubo** em fotos aleatórias. Tem sistema de camadas, censuras, texto, pintura, dezenas de efeitos ajustáveis, looks prontos, modo animado e gravação de vídeo.

- **Sem instalar nada**, sem internet, sem conta.
- **Suas fotos nunca saem do computador** — tudo é processado localmente no navegador.

## Como abrir

**Opção simples:** dê dois cliques em `index.html` (use Chrome, Edge ou Firefox atualizados).

Se algum navegador reclamar de arquivos locais, abra uma pasta de terminal aqui e rode:

```bash
python -m http.server 8000
```

e acesse <http://localhost:8000>.

> Recomendado: **Chrome ou Edge** (a gravação de vídeo e alguns filtros de camada funcionam melhor neles).

## Primeiros passos

1. Arraste uma ou várias fotos para a janela (ou **Abrir fotos**, ou **Ctrl+V** para colar). Sem foto à mão? Clique em **Cena de teste**.
2. Aba **Looks** → escolha um visual (ex.: *VHS 1985*, *Camcorder 1998*, *Câmera de segurança*).
3. Aba **Efeitos** → refine os controles. Duplo clique no nome de um controle volta ao valor padrão.
4. Adicione **texto**, **censuras** e **pintura** pelas camadas.
5. **Exportar PNG/JPG**, ou ligue **Animar** e use **Gravar vídeo**.

A primeira foto define a proporção do quadro (limitada a 1600 px no maior lado). Dá para trocar em **Quadro** (16:9, 4:3, 1:1, 9:16…).

## Camadas

Painel **Camadas** (a de cima fica na frente). Arraste para reordenar; duplo clique renomeia.

| Tipo | Para quê |
|---|---|
| **Imagem** | Fotos. Botões *Preencher / Ajustar / 100%*. Mova, escale, gire, espelhe. |
| **Texto** | Fontes, tamanho, cor, contorno, *glow*, caixa de fundo, espaçamento, multilinha. Há **Carimbos rápidos**: ● REC, PLAY ▶, timestamp, CH 03, NO SIGNAL, AUTO TRACKING, [REDACTED], "NÃO OLHE"… |
| **Censura** | Região retangular ou elíptica (pode girar) que age sobre o que está abaixo dela. Modos: tarja preta, tarja com texto (`[CENSURADO]`), pixelar, borrar, estática de TV, glitch, rabisco de marcador, inverter cores, vermelho sangue. |
| **Pintura** | Camada de pincel/borracha (pincel normal, giz áspero, spray). Ótima para rabiscos, manchas, olhos desenhados… |
| **Ajuste** | Aplica filtros (brilho, contraste, matiz, desfoque…) a **tudo que está abaixo** dela. |

Cada camada tem: **opacidade**, **modo de mistura** (multiplicar, tela, sobrepor, diferença…), **travar**, **ocultar** e filtros próprios.

### "Acima dos efeitos"
Por padrão, os efeitos globais (VHS, grão, CRT…) afetam **todas** as camadas. Marque **Acima dos efeitos** numa camada para ela ficar *limpa* por cima do resultado — útil para legendas nítidas ou uma tarja que não pode ser degradada.

### Achatar e fixar
- **Achatar tudo**: junta as camadas visíveis em uma imagem (sem efeitos).
- **Fixar efeitos (bake)**: transforma o resultado *com efeitos* numa imagem e zera os efeitos. Assim você pode empilhar um segundo "round" de edição por cima (ex.: aplicar VHS e depois pôr texto sujo e outro filtro).

## Efeitos (aba Efeitos)

Como usar o painel:

- **Intensidade geral** (topo): um único controle que multiplica todos os efeitos de uma vez. 100% = como você configurou, 0% = sem efeito, acima de 100% = exagera.
- **Busca**: digite "grão", "tracking", "vinheta"… e só os controles correspondentes aparecem.
- **Mostrar avançados**: por padrão cada grupo mostra só os controles principais; marque a opção para ver o resto.
- **Só os que uso**: mostra apenas o que você já mexeu.
- Só um grupo fica aberto por vez. O número vermelho no grupo diz quantos ajustes foram alterados, e o nome do controle fica verde quando difere do padrão.
- Passe o mouse sobre qualquer controle para ver uma explicação. Cada grupo tem caixinha para ligar/desligar (sem perder os valores) e ↺ para zerar só ele.

- **Cor & Tom** — brilho, contraste, saturação, matiz, temperatura, tinta, desbotado, gama, P&B, sépia, inverter, posterizar e **monocromo** (verde de visão noturna, âmbar, azul CCTV, vermelho…).
- **Foco & Resolução** — desfoque e perda de resolução horizontal/vertical (suave ou pixelada).
- **VHS / Fita** — cor desalinhada, borrão lateral (*bleed*), tremor de linha, ondulação, **tracking** (faixas de ruído), distorção de rodapé (*head switching*), *dropouts* (riscos brancos).
- **Glitch & Corrupção** — fatias deslocadas, blocos corrompidos, divisão RGB.
- **Ruído & Grão** — grão, ruído colorido, estática de TV, poeira/sujeira, riscos verticais de filme.
- **CRT / TV antiga** — scanlines, máscara RGB, curvatura de tela, imagem fantasma, rolagem vertical, flicker.
- **Luz & Vinheta** — vinheta, bloom, vinheta que "respira".
- **Horror & Atmosfera** — pretos esmagados, sombras avermelhadas, névoa, **lanterna** (só um foco de luz no escuro, com posição e tamanho).
- **Carimbo de câmera (HUD)** — estilos *camcorder* (● REC + bateria + data/hora), *VHS PLAY* e *CCTV* (nome da câmera + data). Edite os textos de data e hora/câmera.

### Looks prontos
VHS 1985 · Camcorder 1998 · Câmera de segurança · Visão noturna · Found footage · Liminal/Backrooms · TV de tubo velha · Fita corrompida · Analog horror clássico · Sinal perdido · Filme 35mm vencido · Lanterna no escuro · Pavor vermelho · Limpar tudo. Há também **🎲 Aleatório** na aba Efeitos para misturar coisas ao acaso.

## Animação e vídeo

- **▶ Animar**: o ruído, o tracking, o flicker, o REC piscando e a rolagem passam a se mover em tempo real.
- **🎲 Ruído**: sorteia outro padrão de ruído na imagem parada (a imagem parada é estável de propósito, para os controles não "tremerem" enquanto você ajusta).
- **⏺ Gravar vídeo**: grava 3, 5, 10 ou 20 segundos do resultado animado em **.webm** e baixa o arquivo.

## Ferramentas

| Tecla | Ferramenta |
|---|---|
| `V` | **Mover** — arraste a camada; cantos escalam; a bolinha gira (Shift = passos de 15°) |
| `B` | **Pincel** — tamanho, suavidade, opacidade, cor e tipo |
| `E` | **Borracha** (só em camadas de Pintura) |
| `C` | **Censura** — arraste na imagem para criar uma |
| `T` | **Texto** — clique para inserir |
| `H` | **Mão** — arrastar a vista |

## Atalhos

| Atalho | Ação |
|---|---|
| `Ctrl+Z` / `Ctrl+Shift+Z` (ou `Ctrl+Y`) | Desfazer / refazer (40 passos) |
| `Ctrl+D` | Duplicar camada |
| `Ctrl+S` | Salvar projeto |
| `Delete` | Excluir camada |
| `[` / `]` | Descer / subir camada |
| Setas (`Shift` = ×10) | Ajuste fino de posição |
| `\` (segurar) ou botão **Antes/Depois** | Ver sem efeitos |
| `A` | Liga/desliga animação |
| `F` | Ajustar zoom à janela |
| `Espaço` + arrastar / botão do meio | Mover a vista |
| Roda do mouse | Zoom |
| `Ctrl+V` | Colar imagem |

## Salvar e exportar

- **PNG / JPG**: exporta o quadro atual no tamanho do projeto (sem as alças de seleção).
- **Copiar**: copia a imagem para a área de transferência.
- **Projeto** (`.analog.json`): salva camadas + efeitos para continuar depois com **Abrir projeto**. As imagens ficam embutidas no arquivo.

## Dicas para o visual de analog horror

- **Menos é mais.** O medo vem do que parece *quase normal*. Experimente *VHS 1985* com **Perda de resolução** alta e **Saturação** negativa.
- Um **HUD** com data errada (anos 80/90) e uma câmera "CAM 03" vende a ideia de arquivo encontrado.
- **Censura com texto** (`[REDACTED]`, `[DADOS REMOVIDOS]`) sobre um rosto/objeto desperta curiosidade; **Rabisco de marcador** parece mais "feito à mão".
- Use **Pintura** com o pincel de giz em vermelho escuro para marcar algo na foto, e deixe a camada com modo **Multiplicar**.
- Coloque um texto discreto (ex.: `ELE ESTÁ AQUI`) em **Opacidade 20–35%** com **Mistura: Sobrepor** — quase subliminar.
- Use **Lanterna** + **Pretos esmagados** para esconder metade da foto.
- Para um *jumpscare* de vídeo: ligue **Animar**, suba **Tracking**, **Fatias** e **Estática**, e grave 3 segundos.
- Depois de aplicar um look, clique em **Fixar efeitos** e aplique outro look por cima para um visual ainda mais "regravado".

## Limites e observações

- Fotos grandes são reduzidas internamente para no máximo 2800 px por lado; o quadro padrão é limitado a 1600 px (edite em **Quadro → Personalizado**, até 4096 px — fica mais lento).
- Os efeitos são calculados na CPU; em quadros grandes com muitos efeitos, a animação pode rodar a poucos FPS (isso combina com o visual 😉). Se travar, reduza o tamanho do quadro.
- A **borracha** só apaga camadas de Pintura (imagens não são editadas de forma destrutiva — use censuras e pintura por cima).
- Algumas fontes (Papyrus, Segoe Script, Impact…) dependem do sistema operacional.

## Estrutura dos arquivos

```
index.html   interface
style.css    visual da interface
core.js      estado, camadas, texto, censuras e composição
fx.js        efeitos globais, looks e pipeline (VHS/CRT/grão/glitch)
ui.js        ferramentas, painéis, histórico, importar/exportar
README.md    este arquivo
```
