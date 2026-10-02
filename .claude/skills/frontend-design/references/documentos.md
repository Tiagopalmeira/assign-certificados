# Documentos e certificados (impressão / PDF)

Documentos seguem os mesmos tokens da interface, com regras próprias de impressão.
O objetivo é um papel que pareça oficial, limpo e fácil de verificar.

## Página

- Certificado: **A4 paisagem** (297 × 210 mm). Declarações e comprovantes: A4 retrato.
- Defina a página e use `mm` para medidas do documento:

```css
@page { size: A4 landscape; margin: 0; }

.documento {
  width: 297mm;
  height: 210mm;
  padding: 20mm 24mm;          /* margem de segurança para impressão */
  box-sizing: border-box;
  background: #FFFFFF;
  color: var(--cor-texto);
  font-family: var(--fonte);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  page-break-after: always;
  break-inside: avoid;
}

@media print {
  body { background: #FFFFFF; }
  .nao-imprimir { display: none !important; }
}
```

- Na tela, mostre o documento centralizado sobre `--cor-fundo-alt`, com `--sombra`,
  para simular a folha. Na impressão, só a folha.
- Nada interativo dentro do documento (botões, links, hover). Ações como
  "Baixar PDF" e "Imprimir" ficam fora da folha, com a classe `nao-imprimir`.

## Hierarquia do certificado

Centralizado, com muito espaço em branco. De cima para baixo:

```
+-----------------------------------------------------------+
|  [logo da instituição]                                    |
|                                                           |
|                      Certificado                          |
|                                                           |
|              Certificamos que                             |
|                 MARIA OLIVEIRA SANTOS   <- maior destaque |
|   concluiu o curso Segurança do Trabalho, com carga       |
|   horária de 40 horas, realizado de 01/09 a 30/09/2026.   |
|                                                           |
|              São Paulo, 2 de outubro de 2026              |
|                                                           |
|     ____________________        ____________________      |
|     Nome do responsável         Nome do responsável       |
|     Cargo                       Cargo                     |
|                                                           |
|  Código de validação: A1B2-C3D4      [QR]  valide em ...  |
+-----------------------------------------------------------+
```

- O **nome da pessoa** é o maior elemento (≈ 28–32pt, peso 600, cor `--cor-primaria`).
  O nome é exibido como foi cadastrado (não force caixa-alta via CSS; o esquema acima
  usa maiúsculas apenas para indicar destaque).
- Título "Certificado" em ≈ 20–24pt, peso 500, `--cor-texto-secundario` ou primária.
- Texto descritivo em ≈ 12–13pt, altura de linha 1,6, largura máxima ~180mm.
- Assinaturas: linha fina (`1px solid var(--cor-texto-secundario)`), nome em 11pt
  peso 500, cargo em 10pt `--cor-texto-secundario`.
- Rodapé de validação discreto (9–10pt): código, QR code e URL de verificação.
- Ornamento: no máximo uma moldura fina em `--cor-primaria` ou `--cor-borda`
  (1–2px, inset ~8mm) ou uma faixa estreita na lateral. Sem selos falsos, texturas,
  fontes manuscritas ou brasões genéricos.

## Dados e textos

- Datas por extenso no local/data ("São Paulo, 2 de outubro de 2026") e numéricas no
  período (01/09/2026 a 30/09/2026).
- Carga horária sempre com unidade ("40 horas").
- Use os campos reais do sistema; com dados ausentes, use exemplos claramente fictícios.
- Textos longos (nomes ou cursos extensos) não podem quebrar o layout: teste com um
  nome de ~60 caracteres e um nome de curso de ~100 caracteres; reduza a fonte
  proporcionalmente se necessário, nunca corte o texto.

## Geração de PDF

- Prefira gerar o PDF a partir do mesmo HTML (impressão do navegador ou ferramenta
  headless que o projeto já usar), para que tela e PDF sejam idênticos.
- Garanta que a fonte Inter esteja carregada antes de gerar (aguarde
  `document.fonts.ready`).
- Imagens (logo, assinaturas) em alta resolução (PNG 2x ou SVG).

## Checklist do documento

- [ ] Cabe exatamente em uma folha A4, sem quebra no meio?
- [ ] Nome da pessoa é claramente o maior destaque?
- [ ] Margens de segurança ≥ 15mm em todos os lados?
- [ ] Nada interativo dentro da folha; ações marcadas com `nao-imprimir`?
- [ ] Testado com nome e curso longos?
- [ ] Código de validação presente e legível?
