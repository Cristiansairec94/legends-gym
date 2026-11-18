# nutrition-calculator

Calculadora pública de calorías y macronutrientes para Demo Gym. Página estática (HTML, CSS y JavaScript)
sin backend ni registro: estima el gasto con Mifflin–St Jeor (o Cunningham si la persona conoce su grasa
corporal), propone rangos de proteína, grasas y carbohidratos y los reparte por comidas. Las fuentes
están citadas en la propia página.

- `calculator.js`: motor puro y versionado, también importable desde Node.
- `page.js`: controlador del formulario y de los resultados.

```bash
node --test tests/*.test.cjs        # 52 pruebas: motor y comportamiento de la página
python3 -m http.server    # y abrir http://localhost:8000
```

Las ilustraciones de composición corporal del original se retiraron; la página muestra el texto
alternativo y el resto funciona igual. Es una referencia educativa, no una indicación médica.
