# Playback Cifras PWA

Sistema web simples para iPad/tablet: cada música tem um PDF de cifra e um MP3 de playback.

## Como funciona

- Role o PDF normalmente na tela.
- Use **Próxima** para trocar para a próxima música.
- Use **Anterior** para voltar.
- O PDF e o MP3 são trocados juntos.

## Como cadastrar músicas

Edite o arquivo `songs.json`:

```json
[
  {
    "title": "Nome da música",
    "pdf": "link compartilhado do PDF no Google Drive",
    "mp3": "link compartilhado do MP3 no Google Drive"
  }
]
```

Os arquivos precisam estar compartilhados como: **Qualquer pessoa com o link pode visualizar**.

## Uso no iPad

Este projeto precisa ficar hospedado na internet, por exemplo em Netlify, Vercel ou GitHub Pages.
Depois, abra o link no Safari do iPad e use **Compartilhar > Adicionar à Tela de Início**.

## Observação sobre Google Drive

A versão simples usa os links que você cadastrar no `songs.json`.
Para o sistema ler automaticamente duas pastas separadas do Google Drive e parear PDF/MP3 por nome, será necessária integração com a API do Google Drive.
