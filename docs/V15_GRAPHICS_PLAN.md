# Roweb v15 — reconstrução gráfica

## Escopo

- **Aster v12.3 é preservado sem alterações.**
- A v15 assume apenas chão, catedral/cenário e monstros.
- Gameplay, IA, colisões, drops, inventário, skills, clima e ciclo dia/noite continuam nas camadas existentes.

## Correções visuais

- O matte escuro dos atlas é removido apenas quando conectado às bordas da imagem. Isso evita apagar cabelo, asas, contornos e detalhes escuros dos sprites.
- Chão usa tiles menores e sobrepostos para reduzir o efeito de tabuleiro gigante.
- Estrada e praça da catedral são clipadas e alinhadas.
- Mobs recebem movimento específico por família: squash/bounce do Poring, voo do Morcego, hover do Olho e corrida/lunge do Diabrete.
- Morte usa sequência própria registrada pelo event bus v13.
- Sombras e barras de HP foram realinhadas às novas poses.

## Regra de compatibilidade

`drawPlayer` não é redefinido pela v15. O protagonista continua sendo renderizado pela spritesheet v12.3 aprovada.
