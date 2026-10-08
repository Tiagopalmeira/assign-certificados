# CertAssign

Sistema web para criar modelos de certificado e gerar certificados de graduação em lote,
para qualquer modalidade com graduações: capoeira, judô, jiu-jitsu, karatê e outras.

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

1. **Graduações** (opcional): confira os sistemas prontos ou crie o seu, com as
   graduações em ordem, títulos e cores.
2. **Meus modelos** → *Criar novo modelo*. Envie a arte em PDF, PNG ou JPG. No PDF, só a
   primeira página é usada.
3. **Editor**: adicione os campos (Nome, Graduação, Data, Local, Assinatura, Texto,
   Imagem), arraste e redimensione sobre o certificado e ajuste fonte, tamanho, cor,
   alinhamento, negrito, itálico, espaçamento e rotação no painel da direita. Em *Dados do
   modelo*, escolha o sistema de graduação padrão. Salve.
4. **Gerar certificados** abre o *Novo lote*:
   - **Dados do evento**: sistema de graduação (judô, capoeira…), data (a do modelo ou uma nova), local e assinatura (a do
     modelo ou uma nova; o fundo da imagem é removido automaticamente).
   - **Alunos**: escolha a graduação e cole os nomes, separados por linha, vírgula ou
     ponto e vírgula. Repita para cada graduação. Se o modelo mostra a graduação
     anterior, ela é a que vem antes no sistema; dá para escolher outra no grupo.
   - **Revisão**: resumo, lista completa e prévia de cada certificado.
5. **Concluir** → confira tudo na janela de confirmação → **Gerar certificados**.
6. Baixe o `certificados.zip` (um PDF por aluno), um PDF único para imprimir, ou cada
   certificado separadamente.

Atalhos no editor: `Ctrl+S` salva, `Ctrl+Z` / `Ctrl+Shift+Z` desfaz e refaz, as setas
movem o campo selecionado (com `Shift`, de 10 em 10), `Delete` exclui o campo e
`Ctrl+D` duplica.

No campo **Texto**, você pode usar `{nome}`, `{graduacao}`, `{graduacao_anterior}`, `{titulo}`, `{data}`,
`{local}` e `{assinatura}`. Exemplo: `Certificamos que {nome} recebeu a graduação {graduacao}.`

## Onde ficam os dados

Tudo fica salvo **no próprio navegador** (IndexedDB): modelos, imagens, assinaturas,
fontes enviadas e sistemas de graduação. Não há servidor. Por isso:

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
│   ├── graduationSystems.ts sistemas de graduação e listas prontas
│   ├── colorRuns.ts      cores das palavras da graduação
│   └── db.ts             persistência (IndexedDB)
├── stores/             estado (Pinia): modelos, fontes, sistemas de graduação, lote, arquivos, avisos
├── composables/        estado do editor (seleção, desfazer/refazer, salvar)
├── components/
│   ├── certificate/      editor e prévia (CertificateCanvas, CertificateField,
│   │                     FieldProperties, FieldToolbar, CertificatePreview…)
│   ├── students/         grupos de alunos por graduação
│   ├── graduations/      telas dos sistemas de graduação
│   ├── lot/              etapas do lote, confirmação e downloads
│   ├── templates/        cartões e criação de modelo
│   └── ui/               modal, avisos, envio de arquivo
└── views/              telas: Meus modelos, Editor, Novo lote, Graduações, Fontes
```

### Prévia igual ao PDF

A prévia é desenhada em SVG e o PDF com o pdf-lib, mas os dois usam a **mesma função de
layout** (`lib/textLayout.ts`) e as **mesmas métricas de fonte** (fontkit). Por isso a
quebra de linha, a redução automática de nomes longos e a posição de cada linha ficam
iguais na tela e no arquivo. Quando a fonte não tem negrito ou itálico, os dois lados
simulam o estilo do mesmo jeito.

Modelos em PDF continuam vetoriais no certificado final: a página original é embutida e
os campos são escritos por cima.

### Sistemas de graduação

Cada sistema é a sequência de graduações de uma modalidade, grupo ou federação. Tem:

- **nome** (ex.: "Judô – Federação Paulista");
- **como a graduação é chamada** ("Faixa", "Corda"…), usado nas telas do lote;
- **cores**: palavra → cor. Quando a palavra aparece no nome da graduação ("Roxa",
  "Branco e Azul"), ela sai com essa cor no certificado;
- **graduações em ordem**, cada uma com título opcional (ex.: Professor, Mestre).

Na primeira execução entram listas prontas, que servem de ponto de partida e podem ser
editadas: **Capoeira**, **Judô**, **Jiu-Jitsu (adulto)**, **Jiu-Jitsu (infantil)** e
**Karatê** (`src/lib/graduationSystems.ts`). Cada grupo ou federação pode ter variações.

No editor, o campo **Graduação** tem a opção *Mostrar*: graduação e título
("Preta - Professor", o padrão), só a graduação ou só o título. Graduações sem título
mostram só a graduação. A pintura das cores pode ser desligada no campo. No campo
**Texto**, use `{titulo}`.

O campo **Graduação anterior** mostra de onde o aluno veio ("de Azul para Verde e
Amarelo"), com as mesmas opções. Por padrão é a graduação que vem antes no sistema;
no lote, cada grupo pode escolher outra (quem pulou graduação) ou nenhuma. No campo
**Texto**, use `{graduacao_anterior}`.

## Limitações conhecidas

- Só a primeira página do PDF vira modelo.
- PDFs com página girada ou que o pdf-lib não consegue ler (ex.: protegidos) são
  convertidos em imagem de alta resolução. O certificado sai certo, mas não vetorial.
- A remoção de fundo da assinatura funciona melhor com traço escuro sobre papel claro.
  Há um controle de sensibilidade e a opção de usar a imagem original.
- Fontes embutidas nos PDFs vão inteiras (sem subset), o que deixa cada arquivo um pouco
  maior em troca de compatibilidade com qualquer leitor.
