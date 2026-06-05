# Playback Cifras V7

Sistema PWA para tocar playbacks MP3 e visualizar cifras PDF a partir do Google Drive.

## Novidades da V7

- Lembra a última pasta escolhida no tablet/navegador.
- Sincroniza automaticamente ao abrir quando o login Google está disponível.
- Carrega biblioteca salva localmente para uso rápido.
- Favoritos por dispositivo.
- Playlists/eventos por dispositivo.
- Modo palco com controles simplificados.
- Rolagem automática experimental do PDF.
- Mantém suporte a pasta principal com subpastas por estilo ou pasta direta de músicas.
- Mantém MP3/PDF privado do Drive via autenticação Google.

## Configuração

Edite `config.js`:

```js
window.APP_CONFIG = {
  GOOGLE_CLIENT_ID: "SEU_CLIENT_ID.apps.googleusercontent.com",
  GOOGLE_API_KEY: "SUA_API_KEY",
  ROOT_FOLDER_ID: ""
};
```

## Estrutura recomendada no Google Drive

```
Repertorio
├── Rock
│   ├── Musica 1.pdf
│   └── Musica 1.mp3
├── Sertanejo
│   ├── Musica 2.pdf
│   └── Musica 2.mp3
```

O PDF e o MP3 precisam ter o mesmo nome, mudando apenas a extensão.

## Observação

A rolagem automática depende do visualizador de PDF do navegador. No iPad/Safari pode funcionar melhor que em alguns navegadores desktop.
