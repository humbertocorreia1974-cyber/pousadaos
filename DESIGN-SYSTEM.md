# Sistema de design — PousadaOS
Gerado com **UI/UX Pro Max** (curadoria de estilo + paleta + tipografia).
- **Estilo:** Minimalism & Swiss Style
- **Palavras-chave:** Clean, simple, spacious, functional, white space, high contrast, geometric, sans-serif, grid-based, essential
- **Modo:** light
- **Fontes:** Calistoga (títulos) / Inter (corpo)
- **Efeitos:** Subtle hover (200-250ms), smooth transitions, sharp shadows if any, clear type hierarchy, fast loading
- **Padrão de landing:** Hero + Features + CTA — Hero with headline/image > Value prop > Key features (3-5) > CTA section > Footer
## Tokens (CSS vars em `app/globals.css`)
```css
--bg: 214 100% 97%;
--surface: 0 0% 100%;
--surface-2: 210 38% 94%;
--border: 213 97% 87%;
--fg: 224 64% 33%;
--fg-muted: 215 19% 35%;
--brand: 226 71% 40%;
--brand-fg: 0 0% 100%;
--accent: 142 76% 36%;
--accent-fg: 0 0% 0%;
```
_Use SEMPRE os tokens (`bg-brand`, `text-fg`, `border-border`…), nunca hex cru._