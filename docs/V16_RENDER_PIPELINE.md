# Roweb v16 — pipeline gráfico estável

- Aster v12.3 permanece intocado.
- Corrige a colisão de nome `WORLD` introduzida na v15, que impedia o chão de usar corretamente as dimensões do mapa.
- O renderer de mobs deixa de assumir frames fixos de 24x24 e passa a derivar largura/altura reais do asset carregado.
- Chão, estrada, praça, catedral e props voltam a usar coordenadas determinísticas e clipping.
- Mobs preservam idle, movimento, ataque, hit e morte sem alterar IA, colisão ou combate.
- A v16 é carregada por último e serve como camada de correção sobre v14/v15.
