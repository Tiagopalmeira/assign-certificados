# CertAssign

Sistema web para criar modelos de certificado e gerar certificados em lote, feito para
eventos de capoeira (batizados e trocas de cordas).

Você configura o modelo uma vez e depois gera dezenas de certificados informando só os
nomes dos alunos e as graduações.

## Como rodar

```bash
npm install
npm run dev        # abre em http://localhost:5173
```

Outros comandos:

```bash
npm run build      # checa os tipos e gera a versão de produção em dist/
npm run preview    # serve a versão de produção
npm test           # testes automáticos
```

## Como usar

1. **Meus modelos** → *Criar novo modelo*. Envie a arte em PDF, PNG ou JPG. No PDF, só a
   primeira página é usada.
2. **Editor**: adicione os campos (Nome, Graduação, Data, Local, Assinatura, Texto,
   Imagem), arraste e redimensione sobre o certificado e ajuste fonte, tamanho, cor,
   alinhamento, negrito, itálico, espaçamento e rotação no painel da direita. Salve.
3. **Gerar certificados** abre o *Novo lote*:
   - **Dados do evento**: data (a do modelo ou uma nova), local e assinatura (a do
     modelo ou uma nova; o fundo da imagem é removido automaticamente).
   - **Alunos**: escolha a graduação e cole os nomes, separados por linha, vírgula ou
     ponto e vírgula. Repita para cada graduação.
   - **Revisão**: resumo, lista completa e prévia de cada certificado.
4. **Concluir** → confira tudo na janela de confirmação → **Gerar certificados**.
5. Baixe o `certificados.zip` (um PDF por aluno), um PDF único para imprimir, ou cada
   certificado separadamente.

Atalhos no editor: `Ctrl+S` salva, `Ctrl+Z` / `Ctrl+Shift+Z` desfaz e refaz, as setas
movem o campo selecionado (com `Shift`, de 10 em 10), `Delete` exclui o campo e
`Ctrl+D` duplica.

No campo **Texto**, você pode usar `{nome}`, `{graduacao}`, `{titulo}`, `{data}`,
`{local}` e `{assinatura}`. Exemplo: `Certificamos que {nome} recebeu a graduação {graduacao}.`

## Onde ficam os dados

Tudo fica salvo **no próprio navegador** (IndexedDB): modelos, imagens, assinaturas e
fontes enviadas. Não há servidor. Por isso:

- outro navegador ou outro computador não vê os mesmos modelos;
- limpar os dados do site apaga os modelos.

O lote em andamento fica salvo como rascunho, então os nomes digitados não se perdem se a
página for recarregada.

## Arquitetura

Vue 3 + TypeScript + Vite, com Vue Router e Pinia. Não há biblioteca de componentes: os
controles visuais são componentes pequenos do próprio projeto, com os tokens de design
em `src/assets/tokens.css`.

```
src/
├── types/              tipos do domínio (modelo, campo, lote, fonte…)
├── lib/                lógica sem interface (testável)
│   ├── generator.ts      geração dos PDFs (pdf-lib)
│   ├── textLayout.ts     quebra de linha, redução da fonte para caber e posição do texto
│   ├── fonts.ts          fontes incluídas, escolha de variante, métricas
│   ├── fontConvert.ts    WOFF/WOFF2 → TTF (leitores de PDF não abrem WOFF)
│   ├── templateImport.ts leitura do PDF/imagem do modelo (pdf.js)
│   ├── signature.ts      remoção do fundo da assinatura
│   ├── names.ts          separação dos nomes digitados
│   ├── filename.ts       nomes de arquivo seguros (João da Silva → Joao_da_Silva.pdf)
│   ├── graduations.ts    lista inicial de graduações
│   └── db.ts             persistência (IndexedDB)
├── stores/             estado (Pinia): modelos, fontes, graduações, lote, arquivos, avisos
├── composables/        estado do editor (seleção, desfazer/refazer, salvar)
├── components/
│   ├── certificate/      editor e prévia (CertificateCanvas, CertificateField,
│   │                     FieldProperties, FieldToolbar, CertificatePreview…)
│   ├── students/         grupos de alunos por graduação
│   ├── lot/              etapas do lote, confirmação e downloads
│   ├── templates/        cartões e criação de modelo
│   └── ui/               modal, avisos, envio de arquivo
└── views/              telas: Meus modelos, Editor, Novo lote, Fontes
```

### Prévia igual ao PDF

A prévia é desenhada em SVG e o PDF com o pdf-lib, mas os dois usam a **mesma função de
layout** (`lib/textLayout.ts`) e as **mesmas métricas de fonte** (fontkit). Por isso a
quebra de linha, a redução automática de nomes longos e a posição de cada linha ficam
iguais na tela e no arquivo. Quando a fonte não tem negrito ou itálico, os dois lados
simulam o estilo do mesmo jeito.

Modelos em PDF continuam vetoriais no certificado final: a página original é embutida e
os campos são escritos por cima.

### Graduações

A lista inicial fica em `src/lib/graduations.ts`. Algumas graduações conferem um título:

| Graduação | Título |
|---|---|
| Verde e Amarelo | Instrutor |
| Verde, Amarelo e Azul | Formado |
| Branco e Verde | Monitor |
| Branco e Amarelo | Professor |
| Branco e Azul | Contramestre |
| Branco | Mestre |

No editor, o campo **Graduação** tem a opção *Mostrar*: graduação e título
("Verde e Amarelo - Instrutor", o padrão), só a graduação ou só o título. Graduações sem
título mostram só a graduação. No campo **Texto**, use `{titulo}`.

Cada cor no nome da graduação sai na própria cor (verde, amarelo, azul, branco). Amarelo
e branco ganham um contorno fino na cor do campo para ficarem legíveis em papel claro. Dá
para desligar isso no campo **Graduação** ("Pintar cada cor com a própria cor"). As cores
ficam em `src/lib/colorRuns.ts`.

A lista fica salva no banco. A store `useGraduationsStore` já tem `save(lista)`; para
tornar a lista editável, falta só a tela.

## Limitações conhecidas

- Só a primeira página do PDF vira modelo.
- PDFs com página girada ou que o pdf-lib não consegue ler (ex.: protegidos) são
  convertidos em imagem de alta resolução. O certificado sai certo, mas não vetorial.
- A remoção de fundo da assinatura funciona melhor com traço escuro sobre papel claro.
  Há um controle de sensibilidade e a opção de usar a imagem original.
- Fontes embutidas nos PDFs vão inteiras (sem subset), o que deixa cada arquivo um pouco
  maior em troca de compatibilidade com qualquer leitor.
