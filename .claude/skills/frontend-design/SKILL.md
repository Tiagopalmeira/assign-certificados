---
name: frontend-design
description: Use ao criar, redesenhar ou ajustar qualquer interface — telas de apps para clientes (Vue), componentes, formulários, páginas, e também documentos para impressão/PDF como certificados. Define o padrão visual da casa (corporativo sóbrio, azul-marinho, sans-serif neutra, layout arejado, cantos suaves, textos em pt-BR) e o processo para entregar interfaces simples, claras e consistentes.
---

# Frontend Design — interfaces simples e sóbrias

Você é o designer responsável pela identidade visual deste projeto. O cliente quer
interfaces **simples, corporativas e confiáveis**: nada de enfeite, nada de "cara de
template". Cada tela deve parecer feita para a tarefa dela e ser entendida em segundos.

A regra de ouro: **se um elemento não ajuda a pessoa a entender ou agir, ele sai.**

## Perfil do cliente (padrões fixos)

| Eixo | Escolha |
|---|---|
| Uso principal | Apps para clientes finais e documentos/certificados (impressão e PDF) |
| Tom | Corporativo sóbrio: neutro, confiável, uma cor de marca discreta |
| Cor de marca | Azul-marinho |
| Tipografia | Sans-serif neutra (Inter; alternativa IBM Plex Sans) |
| Densidade | Arejada: pouca coisa por tela, foco em uma tarefa |
| Formas | Cantos suaves (4–8px), quase sem sombra |
| Stack | Vue 3 (SFC, `<script setup>`) |
| Idioma | Português do Brasil |

Se o pedido disser algo diferente, **o pedido vence**. Fora isso, siga estes padrões
sem perguntar de novo.

## Tokens de design

Os tokens oficiais estão em [`tokens.css`](tokens.css). Use sempre as variáveis CSS,
nunca valores soltos. Se o projeto ainda não tem os tokens, copie esse arquivo para o
CSS global (ex.: `src/assets/tokens.css`) e importe no `main`.

Resumo da paleta:

| Token | Hex | Uso |
|---|---|---|
| `--cor-primaria` | `#1F3A5F` | Botão principal, links, foco, títulos de destaque |
| `--cor-primaria-forte` | `#162C49` | Hover/pressionado da primária |
| `--cor-primaria-suave` | `#EAF0F6` | Fundo de item selecionado, avisos informativos |
| `--cor-texto` | `#1B2430` | Texto principal |
| `--cor-texto-secundario` | `#5B6575` | Texto de apoio, legendas, placeholders |
| `--cor-borda` | `#DCE1E7` | Bordas de campos, divisórias |
| `--cor-fundo` | `#FFFFFF` | Fundo das superfícies |
| `--cor-fundo-alt` | `#F5F7FA` | Fundo da página atrás de cartões/painéis |
| `--cor-sucesso` / `--cor-erro` / `--cor-aviso` | `#1E7A4C` / `#B42318` / `#A15C07` | Só para estados — nunca decoração |

Regras de cor:
- **Uma cor de marca só.** Azul aparece em ações e em pouquíssimos destaques. A maior
  parte da tela é branca, cinza-claro e texto escuro.
- Cores de estado (verde, vermelho, âmbar) aparecem apenas quando há um estado real
  para comunicar, e sempre acompanhadas de texto ou ícone (nunca só a cor).
- Sem gradientes, sem fundos coloridos em seções inteiras, sem sombras decorativas.

## Tipografia

- Família única: **Inter** (`--fonte`), com fallback para a fonte do sistema.
  Carregue só os pesos usados: 400, 500 e 600.
- Escala (razão ~1,25), em `rem`: 0,75 · 0,875 · 1 · 1,25 · 1,5 · 2.
  Corpo de texto em 1rem (16px), nunca menor que 0,875rem para texto de leitura.
- Pesos: 400 para texto, 500 para rótulos e botões, 600 para títulos. Não use 700+.
- Altura de linha: 1,5 no corpo, 1,25 em títulos.
- Linhas de texto com no máximo ~70 caracteres (`max-width: 65ch` em blocos de texto).
- **Sentence case sempre** ("Emitir certificado", não "Emitir Certificado" nem
  "EMITIR CERTIFICADO"). Sem caixa-alta em rótulos, sem palavras destacadas em cor ou
  itálico dentro de títulos.

## Layout e espaçamento

- Grade de espaçamento de 4px: use `--esp-1` (4px) até `--esp-9` (64px).
  Entre grupos relacionados, pouco espaço; entre grupos diferentes, bem mais. O espaço
  é o que separa as coisas — prefira espaço a linhas e caixas.
- **Uma tarefa principal por tela.** Um título claro, o conteúdo, e **um** botão
  primário. Ações secundárias como botão secundário ou link.
- Alinhamento à esquerda por padrão. Centralizar só em telas curtas e isoladas
  (login, confirmação, estado vazio) e no certificado.
- Largura de conteúdo: formulários até ~480px, conteúdo de leitura até ~720px,
  telas com tabela até ~1120px. Centralize o contêiner na página.
- Mobile primeiro: tudo deve funcionar a partir de 360px de largura, sem rolagem
  horizontal; alvos de toque com no mínimo 44px de altura.
- Cartões só quando agrupam algo de fato independente. Não fatie a tela em vários
  cartões iguais. Raio: `--raio-sm` (4px) em campos/botões pequenos, `--raio` (6px)
  em botões e campos, `--raio-lg` (8px) em cartões e modais.
- Sombra (`--sombra`) apenas em elementos que flutuam sobre a página: modais,
  menus suspensos, toasts.

## Componentes base

Ao criar telas, prefira estes padrões (e reutilize componentes que o projeto já tiver
antes de criar novos):

- **Botões:** primário (fundo azul, texto branco), secundário (fundo branco, borda,
  texto escuro), terciário/link (só texto azul). Altura 40px (44px no mobile).
  O texto do botão diz exatamente o que acontece: "Salvar alterações", "Baixar PDF".
  Sem setas "→" nem ícones decorativos no texto.
- **Campos:** rótulo visível acima do campo (nunca só placeholder), texto de ajuda
  abaixo quando necessário, mensagem de erro abaixo em vermelho com ícone. Campos
  obrigatórios são o padrão; marque os opcionais com "(opcional)".
- **Tabelas/listas:** linhas com bastante respiro, cabeçalho em `--cor-texto-secundario`
  peso 500, sem zebra forte (no máximo `--cor-fundo-alt` no hover).
- **Feedback:** toast curto para sucesso ("Certificado emitido."), mensagem inline para
  erros de formulário, aviso em caixa `--cor-primaria-suave` para informação.
- **Estados vazios:** uma frase dizendo o que falta e um botão para resolver
  ("Nenhum certificado emitido ainda." + "Emitir certificado").
- **Carregamento:** esqueleto (skeleton) ou spinner discreto; desabilite o botão
  enquanto a ação roda e troque o texto ("Salvando…").

## Padrões de código (Vue 3)

- Componentes SFC com `<script setup>` e Composition API. Use `lang="ts"` se o projeto
  usa TypeScript.
- Antes de criar, verifique o que o projeto já usa (biblioteca de componentes, roteador,
  pasta `components/`, CSS global) e siga isso.
- Estilos em `<style scoped>` usando só as variáveis de `tokens.css`. Seletores simples,
  por classe, com baixa especificidade — evite combinar seletores de tipo e de classe
  que se anulem (comum em margin/padding entre seções).
- Componentes pequenos e com uma responsabilidade; props com nomes claros; emita
  eventos em vez de mutar props.
- HTML semântico: `<button>` para ações, `<a>` para navegação, `<label for>` em todo
  campo, `<main>`, `<header>`, `<nav>` quando fizer sentido.

## Acessibilidade (piso de qualidade, sem anunciar)

- Contraste mínimo 4,5:1 para texto (a paleta acima já atende).
- Foco visível em tudo que é interativo: `outline: 2px solid var(--cor-primaria);
  outline-offset: 2px`. Nunca remova o outline sem substituto.
- Navegação completa por teclado; ordem de foco lógica.
- Respeite `prefers-reduced-motion`. Animações só como resposta a uma ação
  (abrir, expandir, confirmar), curtas (150–200ms) e sem efeitos de entrada em seções.
- Imagens com `alt`; ícones que são só decorativos com `aria-hidden="true"`.

## Textos da interface (pt-BR)

As palavras fazem parte do design. Escreva pouco e com clareza.

- Fale com "você", em linguagem simples, do ponto de vista de quem usa — não de como o
  sistema funciona ("Seus certificados", não "Registros emitidos na base").
- Botões com verbo no infinitivo: "Emitir", "Salvar alterações", "Enviar por e-mail".
  O mesmo nome acompanha o fluxo inteiro: o botão "Emitir certificado" gera o toast
  "Certificado emitido."
- Erros dizem o que aconteceu e como resolver, sem pedir desculpas e sem ser vago:
  "Informe um CPF válido, com 11 dígitos." em vez de "Ops! Algo deu errado."
- Sem frases de marketing, sem exclamações, sem textos de enfeite acima dos títulos.
- Formatos brasileiros: datas `02/10/2026` ou "2 de outubro de 2026", moeda `R$ 1.234,56`,
  CPF `000.000.000-00`, CNPJ `00.000.000/0000-00`.
- Sem conteúdo real disponível, use exemplos plausíveis e claramente fictícios
  (ex.: "Maria Oliveira", "Curso de Segurança do Trabalho — 40 horas").

## Documentos e certificados

Para qualquer layout de impressão ou PDF (certificado, declaração, comprovante), siga
também [`references/documentos.md`](references/documentos.md).

## Processo

1. **Entenda a tarefa.** Quem usa a tela, qual é a única coisa que ela precisa fazer,
   que dados aparecem. Se o pedido não deixar isso claro, assuma o mais provável e diga
   o que assumiu.
2. **Planeje em poucas linhas.** Estrutura da tela (um wireframe ASCII curto ajuda),
   qual é a ação principal, quais componentes do projeto reaproveitar. Os tokens já
   estão definidos — não invente outra paleta ou fonte.
3. **Construa** seguindo os tokens e os padrões acima.
4. **Revise com a lista abaixo** e corte o que sobrar. Se der para tirar um screenshot,
   tire e olhe. Antes de entregar, remova mais um elemento que não faça falta.

### Checklist final

- [ ] Existe um único botão primário e fica claro qual é a ação principal?
- [ ] Só uma cor de marca (azul), e cores de estado apenas onde há estado?
- [ ] Todo valor de cor, espaço, raio e fonte vem de `tokens.css`?
- [ ] Textos em pt-BR, sentence case, botões com verbo, erros que explicam a solução?
- [ ] Funciona em 360px sem rolagem horizontal?
- [ ] Foco visível, labels em todos os campos, contraste ok, reduced motion respeitado?
- [ ] Nenhum enfeite sobrando: gradiente, sombra em tudo, cartões repetidos, rótulos em
      caixa-alta, numeração "01/02/03" sem sequência real, setas "→" em botões?
