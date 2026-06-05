# Playback Cifras PWA

Sistema web para tocar playbacks MP3 sincronizados com cifras em PDF armazenadas no Google Drive.

## Estrutura esperada no Google Drive

Uma pasta principal com subpastas por estilo:

```text
Repertório Playback
├── Rock
│   ├── Fear of the Dark.pdf
│   └── Fear of the Dark.mp3
├── Sertanejo
│   ├── Evidências.pdf
│   └── Evidências.mp3
```

O PDF e o MP3 precisam ter o mesmo nome, mudando apenas a extensão.

## Configuração

Edite `config.js` e coloque seu Client ID do Google:

```js
GOOGLE_CLIENT_ID: "SEU_CLIENT_ID.apps.googleusercontent.com"
```

`GOOGLE_API_KEY` é opcional, mas pode ser necessário para o seletor visual de pasta do Google Drive em alguns navegadores. Se não configurar API Key, o usuário ainda pode colar o ID da pasta manualmente.


## Versão V5
- Corrige cache do `config.js` no PWA.
- Carrega o MP3 pelo Google Drive usando autorização OAuth e cria um áudio local temporário para o player.
- Chama `audio.load()` automaticamente ao trocar de música.


## V6
- Aceita selecionar a pasta principal com estilos ou uma subpasta direta com músicas.
- Carrega PDF e MP3 privados via Google Drive API autenticada.
- Mantém config.js fora do cache.
