# Roweb — protótipo MMORPG web

Protótipo jogável de um RPG online-like inspirado no ritmo de MMORPGs clássicos, construído do zero para a web e sem reutilizar sprites, mapas, áudio ou outros assets proprietários.

## Escopo atual

- Um único mapa: **Vale da Catedral Caída**.
- Progressão de classe: **Noviço → Sacerdote → Sumo Sacerdote**.
- Combate em tempo real contra monstros da família **Demônio**.
- Chefe de mapa: **Poring Demoníaco**.
- Habilidades: Ataque Normal, Cura, Magnificat, Benção e Kyrie Eleison.
- As habilidades originalmente defensivas/de suporte foram reinterpretadas para também causar dano sagrado aos monstros.
- Movimento por WASD/setas ou clique no mapa.
- Seleção de alvo por clique ou `Tab`.
- Hotkeys `1` a `5` para habilidades.
- XP, níveis, evolução de classe e respawn.
- HUD, minimapa, log de batalha, cooldowns, partículas e efeitos visuais procedurais.
- Presença multiplayer via WebSocket: jogadores conectados ao mesmo servidor aparecem no mapa.
- Modo solo continua funcionando caso o WebSocket não esteja disponível.

## Habilidades

| Tecla | Habilidade | Função no Roweb |
| --- | --- | --- |
| 1 | Ataque Normal | Ataque básico de curto alcance. |
| 2 | Cura | Dano sagrado no alvo demoníaco e pequena cura no jogador. |
| 3 | Magnificat | Explosão sagrada em área com múltiplos pulsos e regeneração de SP. |
| 4 | Benção | Golpe sagrado que enfraquece o ataque do monstro e aumenta o dano sagrado recebido. |
| 5 | Kyrie Eleison | Cria barreira no jogador e causa explosão sagrada ao redor; explode novamente ao terminar. |

## Evolução

- Nível 1: Noviço
- Nível 8: Sacerdote
- Nível 16: Sumo Sacerdote

A evolução aumenta atributos e melhora as habilidades automaticamente.

## Rodando localmente

Requer Node.js 18+.

```bash
npm install
npm run dev
```

Depois, abra `http://localhost:4173` no navegador.

Para uma sessão multiplayer simples, basta abrir o mesmo endereço em dois navegadores ou dispositivos que consigam acessar o mesmo servidor.

## Validação

```bash
npm run check
```

O comando valida a sintaxe do servidor e do cliente.

## Direção do projeto

Esta primeira entrega é um **vertical slice** jogável. O servidor atual sincroniza presença, posição, nível e classe dos jogadores. O combate e os monstros ainda são processados no cliente. A próxima evolução natural é tornar o servidor autoritativo para combate e mobs e depois adicionar contas, persistência, party, chat, loot/equipamentos e sincronização completa do mundo.

## Propriedade intelectual

O projeto é um fan prototype inspirado em convenções de MMORPGs clássicos. Todos os gráficos e efeitos desta versão são procedurais/originais. Não inclui sprites, mapas, músicas, efeitos sonoros ou arquivos extraídos de Ragnarok Online.
