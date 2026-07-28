import type { DeepFiches } from "./types";

// Fichas en profundidad — español.
const es: DeepFiches = {
  // ---------------------------------------------------------------- VOTO ----
  simple_vote: {
    summary:
      "Una vuelta, un voto, gana quien más votos reúne. Es el sistema más extendido del mundo y el más criticado: el ganador puede haber convencido solo a una minoría.",
    history: [
      "El escrutinio mayoritario a una vuelta no tiene inventor: nace del uso, en las asambleas medievales inglesas, donde cada condado designaba un representante. Su apodo inglés, « first past the post », es una metáfora hípica: el primero en la meta, sin preguntar por cuánto.",
      "El Imperio británico lo exportó casi a todas partes: Reino Unido, India, Canadá, Estados Unidos, Nigeria. Hoy sigue rigiendo a una parte considerable de la población mundial, más por herencia colonial que por elección teórica.",
      "En 1951, el jurista Maurice Duverger enunció la regularidad que lleva su nombre: el escrutinio mayoritario a una vuelta tiende a producir un bipartidismo, porque votar a una tercera opción equivale a desperdiciar el voto. No es una ley en sentido físico, pero la correlación se ha sostenido desde entonces.",
    ],
    mechanics: [
      "Cada votante señala una sola opción. Se cuentan los votos y se ordenan; gana el total más alto. Nada se pregunta sobre lo que el votante piensa de las demás opciones.",
      "Cuidado con el vocabulario: este sistema da una PLURALIDAD (más votos), no una MAYORÍA (más de la mitad). Ambas coinciden solo con dos opciones. Con tres, un ganador con el 34 % frente al 66 % de opositores dispersos es perfectamente posible.",
      "En caso de empate exacto, ninguna regla interna decide: hace falta un desempate externo (sorteo, voto de calidad, antigüedad). Placet muestra el empate en vez de inventar un ganador.",
    ],
    example: {
      intro: "Cien personas eligen el lugar del seminario. Tres opciones, una vuelta.",
      head: ["Opción", "Votos", "Parte"],
      rows: [
        ["Lyon", "40", "40 %"],
        ["Burdeos", "35", "35 %"],
        ["Lille", "25", "25 %"],
      ],
      steps: [
        "Lyon encabeza con 40 votos: es el ganador.",
        "Pero 60 personas de 100 votaron contra Lyon.",
        "Si los partidarios de Lille prefirieran Burdeos a Lyon, Burdeos ganaría un duelo por 60 a 40.",
      ],
      result:
        "Gana quien reúne más primeras opciones, no lo que el grupo prefiere. Es exactamente lo que Condorcet reprochaba a este sistema ya en 1785.",
    },
    useCases: [
      "Elecciones legislativas en Reino Unido, India y Canadá.",
      "Elección presidencial estadounidense dentro de cada estado, donde el ganador se lleva los compromisarios.",
      "Decisiones de grupo rápidas, cuando la velocidad importa más que el matiz.",
      "Sondeos exprés y elecciones binarias, donde pluralidad y mayoría coinciden.",
    ],
    limits: [
      { t: "Ganador minoritario", d: "Con tres opciones o más se puede ganar sin haber convencido nunca a la mitad del grupo." },
      {
        t: "Efecto spoiler",
        d: "Una opción parecida a otra divide su campo y hace ganar a una tercera. De ahí el voto útil, que empuja a renunciar a la verdadera primera opción.",
      },
      {
        t: "Ley de Duverger",
        d: "A fuerza de voto útil, la oferta se reduce a dos campos. Los matices desaparecen antes incluso de votar.",
      },
      {
        t: "Sensible al trazado",
        d: "Cuando se vota por circunscripciones, dónde se trazan las fronteras pesa tanto como los votos: la puerta abierta al gerrymandering.",
      },
    ],
    faq: [
      {
        q: "¿Qué diferencia hay entre pluralidad y mayoría?",
        a: "La pluralidad son más votos; la mayoría es más de la mitad. Un ganador con el 40 % tiene la pluralidad sin la mayoría. Si su decisión debe ser legítima ante un grupo que tendrá que vivirla, esa diferencia es todo menos un detalle.",
      },
      {
        q: "¿Por qué sigue tan extendido?",
        a: "Porque se entiende al instante, se cuenta a mano y siempre da un resultado claro. Sus defectos están documentados desde 1785, pero su sencillez es una ventaja política real.",
      },
      {
        q: "¿Cuándo conviene evitarlo?",
        a: "En cuanto hay más de dos opciones y el grupo deberá convivir con la decisión. El voto por aprobación cuesta el mismo esfuerzo y resuelve lo esencial del problema.",
      },
    ],
  },

  two_round: {
    summary:
      "Si nadie alcanza el 50 % en la primera vuelta, los dos mejores se enfrentan en la segunda. El ganador tiene necesariamente mayoría absoluta, pero solo frente al finalista que le tocó.",
    history: [
      "El escrutinio a dos vueltas es un invento francés del siglo XIX, generalizado bajo la Tercera República. La Quinta República lo retoma en 1958 para las legislativas y en 1962 para la elección presidencial por sufragio universal directo, aplicada por primera vez en 1965.",
      "La idea es un compromiso político: conservar la claridad del escrutinio mayoritario corrigiendo su defecto más visible, el ganador minoritario. La segunda vuelta obliga a un arbitraje explícito entre dos opciones.",
      "Se difundió mucho más allá de Francia: Austria, Portugal, Brasil, Polonia, la mayoría de las presidenciales latinoamericanas y buena parte de las votaciones asociativas francófonas.",
    ],
    mechanics: [
      "Primera vuelta: cada uno vota por una opción. Si alguna supera el umbral (50 % por defecto en Placet, ajustable), se acabó.",
      "Si no, segunda vuelta entre las dos primeras — la regla habitual. Las legislativas francesas usan otro criterio: pasan todos los candidatos que alcancen el 12,5 % del censo, de ahí las triangulares.",
      "En la segunda vuelta la mayoría absoluta está mecánicamente garantizada: con dos opciones, la pluralidad ES la mayoría. Es una garantía aritmética, no de consenso.",
    ],
    example: {
      intro: "Las mismas cien personas, esta vez a dos vueltas.",
      head: ["Opción", "1ª vuelta", "2ª vuelta"],
      rows: [
        ["Lyon", "40", "45"],
        ["Burdeos", "35", "55"],
        ["Lille", "25", "eliminada"],
      ],
      steps: [
        "Nadie alcanza el 50 %: Lyon y Burdeos pasan a la segunda vuelta.",
        "Los 25 votos de Lille se transfieren: 20 a Burdeos, 5 a Lyon.",
        "Burdeos gana por 55 a 45.",
      ],
      result:
        "La segunda vuelta corrigió el resultado de la primera. Pero fíjese en lo que no hizo: si Lille hubiera sido el compromiso preferido por todos en segunda posición, habría quedado eliminada en la primera vuelta sin ser probada nunca en duelo.",
    },
    useCases: [
      "Elección presidencial francesa y de numerosas repúblicas.",
      "Elecciones legislativas y departamentales en Francia.",
      "Votaciones asociativas y sindicales, donde la mayoría absoluta suele ser estatutaria.",
      "Decisiones de grupo comprometidas, cuando un mandato claro importa más que la rapidez.",
    ],
    limits: [
      {
        t: "El compromiso muere en la primera vuelta",
        d: "Una opción moderada, segunda de todos pero primera de nadie, no supera la primera vuelta. Un ganador de Condorcet puede quedar eliminado antes de jugar.",
      },
      {
        t: "No monotonía",
        d: "Ganar votos puede hacer perder. Al cambiar el dúo clasificado, un apoyo extra en la primera vuelta puede enfrentarle a un rival más peligroso. El resultado no evoluciona siempre en el mismo sentido que los votos.",
      },
      { t: "Coste y desmovilización", d: "Dos escrutinios, dos organizaciones y una participación que casi siempre baja en la segunda vuelta." },
      {
        t: "Voto útil desplazado, no suprimido",
        d: "Ya no se trata de ganar sino de clasificarse: el cálculo táctico se traslada a la primera vuelta.",
      },
    ],
    faq: [
      {
        q: "¿La segunda vuelta garantiza un consenso real?",
        a: "No: garantiza una mayoría absoluta frente a UN adversario dado. Si el duelo propuesto no es el bueno — porque el compromiso quedó eliminado en la primera vuelta — la mayoría obtenida es aritmética, no política.",
      },
      {
        q: "¿Cómo puede un candidato perder ganando votos?",
        a: "Cambiando de adversario en la segunda vuelta. Supongamos que usted gana por poco a A pero pierde con B: unos votos más en la primera vuelta pueden eliminar a A en favor de B y costarle la elección. Es el fallo de monotonía, conocido y demostrable.",
      },
      {
        q: "¿Dos vueltas o Condorcet?",
        a: "Condorcet prueba TODOS los duelos en una sola votación, mientras que la segunda vuelta prueba solo uno, elegido por la primera. Si su grupo puede ordenar las opciones, Condorcet responde a la misma pregunta de forma más completa.",
      },
    ],
  },

  approval: {
    summary:
      "Cada persona marca todas las opciones que le convienen, sin ordenarlas. Gana la que reúne más aprobaciones. Un esfuerzo casi nulo para una ganancia de calidad considerable.",
    history: [
      "La aprobación tiene antepasados: la República de Venecia la usaba desde el siglo XIII en algunas fases de la elección del dux, y varias órdenes religiosas la empleaban para designar a sus superiores.",
      "Su formalización moderna data de 1978: Steven Brams y Peter Fishburn publican « Approval Voting » en la American Political Science Review y la convierten en el método más estudiado de la renovación estadounidense de la teoría de la elección social.",
      "Hoy la usan varias sociedades científicas (entre ellas el IEEE y la American Mathematical Society), el Consejo de Seguridad de la ONU en sus votaciones indicativas para designar al secretario general y, desde 2018, las elecciones municipales de Fargo (Dakota del Norte), a las que se sumó San Luis (Misuri) en 2020.",
    ],
    mechanics: [
      "Cada votante marca tantas opciones como quiera: ninguna, una sola, todas. Cada marca vale un punto; se suman.",
      "La papeleta no pide ninguna ordenación: es una simple frontera entre lo que el votante acepta y lo que rechaza. Esa economía cognitiva es el argumento principal del método.",
      "Consecuencia notable: el voto útil desaparece, porque apoyar a su favorito nunca impide apoyar también el compromiso. Ser sincero ya no puede perjudicarle.",
    ],
    example: {
      intro: "Cien personas marcan todo lo que les conviene.",
      head: ["Opción", "Aprobaciones", "Tasa"],
      rows: [
        ["Burdeos", "72", "72 %"],
        ["Lyon", "58", "58 %"],
        ["Lille", "41", "41 %"],
      ],
      steps: [
        "Muchos de los 40 partidarios de Lyon marcaron también Burdeos.",
        "Burdeos reúne 72 aprobaciones: es el lugar que más gente acepta.",
        "El total supera el 100 %, y es normal: se cuentan aprobaciones, no votos exclusivos.",
      ],
      result:
        "La aprobación mide la aceptabilidad, no el entusiasmo. Para una decisión que todo el grupo deberá vivir, suele ser la buena pregunta.",
    },
    useCases: [
      "Elegir fecha, lugar o restaurante: varias respuestas son aceptables.",
      "Preseleccionar candidaturas antes de una entrevista.",
      "Elecciones municipales de Fargo y San Luis, votaciones internas del IEEE.",
      "Sondeos de prevalencia, donde se busca lo extendido más que lo primero.",
    ],
    limits: [
      {
        t: "Ninguna intensidad",
        d: "« Me encanta » y « puedo vivir con ello » cuentan igual. El juicio mayoritario existe precisamente para llenar ese vacío.",
      },
      {
        t: "El dilema del umbral",
        d: "¿Dónde poner la frontera de aprobación? Marcar amplio ayuda al consenso pero diluye a su favorito; marcar estrecho hace lo contrario. Es la verdadera palanca táctica del método.",
      },
      {
        t: "Sensible al nivel de exigencia",
        d: "Un grupo generoso y uno severo no producen la misma clasificación a partir de las mismas preferencias.",
      },
    ],
    faq: [
      {
        q: "¿Cuántas opciones hay que marcar?",
        a: "Todas aquellas con las que estaría sinceramente de acuerdo. La estrategia más sólida consiste en marcar todo lo que prefiere al resultado que juzga probable.",
      },
      {
        q: "¿Es normal un total superior al 100 %?",
        a: "Sí. No se reparten cien votos: se cuenta, para cada opción, cuánta gente la acepta. Los porcentajes se leen opción por opción.",
      },
      {
        q: "¿Aprobación o juicio mayoritario?",
        a: "La aprobación pide un clic y responde a « ¿es aceptable? ». El juicio mayoritario pide una mención por opción y responde a « ¿hasta qué punto? ». Empiece por la aprobación; pase a las menciones cuando los matices cuenten de verdad.",
      },
    ],
  },

  borda: {
    summary:
      "Cada persona ordena las opciones; los rangos se convierten en puntos y se suman. El método premia el consenso amplio antes que el fervor de un campo.",
    history: [
      "Jean-Charles de Borda, marino, matemático y físico, presenta su memoria sobre las elecciones por escrutinio a la Real Academia de Ciencias en 1770; se publica en 1781. Su constatación es simple: el escrutinio ordinario puede elegir a un candidato que la mayoría rechaza.",
      "La idea es más antigua. El filósofo mallorquín Ramon Llull describe ya a finales del siglo XIII procedimientos de comparación por pares y de ordenación, en manuscritos redescubiertos solo en 2001. Nicolás de Cusa propone en 1433 un método por puntos para elegir al emperador del Sacro Imperio.",
      "La Academia de Ciencias adopta el método de Borda para elegir a sus miembros, hasta que Napoleón, incorporado en 1797, lo hace abandonar. Borda ya había respondido de antemano a las críticas sobre su manipulabilidad: su escrutinio, decía, estaba hecho solo para gente honesta.",
    ],
    mechanics: [
      "Con n opciones, un primer puesto vale n−1 puntos, el segundo n−2, y así hasta 0 para el último. Se suman los puntos de cada opción.",
      "La variante llamada Dowdall (usada en Nauru) atribuye 1, 1/2, 1/3…: pondera mucho más los primeros puestos. La escala cambia el resultado, y no es un detalle de implementación.",
      "Placet aplica la escala clásica n−1, n−2, … 0, lo que hace legibles las diferencias: un punto equivale exactamente a un rango ganado en una papeleta.",
    ],
    example: {
      intro: "Tres opciones, cinco papeletas ordenadas. Un primer puesto vale 2 puntos, un segundo 1, un tercero 0.",
      head: ["Papeletas", "1º", "2º", "3º"],
      rows: [
        ["2 votantes", "Lyon", "Burdeos", "Lille"],
        ["2 votantes", "Lille", "Burdeos", "Lyon"],
        ["1 votante", "Burdeos", "Lyon", "Lille"],
      ],
      steps: ["Lyon: 2×2 + 1×1 = 5 puntos.", "Lille: 2×2 = 4 puntos.", "Burdeos: 2×1 + 2×1 + 1×2 = 6 puntos."],
      result:
        "Burdeos gana sin ser la primera opción de casi nadie: es la segunda de todos. Es precisamente lo que Borda buscaba capturar, y lo que sus detractores le reprochan.",
    },
    useCases: [
      "Elecciones parlamentarias en Nauru y escaños reservados a minorías en Eslovenia.",
      "Premios deportivos y culturales: Balón de Oro, trofeos MVP, premios literarios.",
      "Elegir un orden del día o una prioridad colectiva, cuando todas las opciones deben compararse.",
      "Decisiones de equipo donde se busca la opción menos divisiva.",
    ],
    limits: [
      {
        t: "Manipulable por clones",
        d: "Añadir opciones débiles cercanas a un competidor hunde su media. Hacer la lista de opciones se convierte en un acto político.",
      },
      {
        t: "Voto táctico por enterramiento",
        d: "Colocar artificialmente último al rival más serio resulta rentable y es prácticamente indetectable.",
      },
      {
        t: "Incumple el criterio de Condorcet",
        d: "Una opción que gana todos sus duelos puede perder en el recuento Borda. Ambos métodos responden a preguntas distintas, y Borda lo asume.",
      },
    ],
    faq: [
      {
        q: "¿Borda o Condorcet?",
        a: "Borda mide una satisfacción media y siempre da un resultado; Condorcet busca al campeón de todos los duelos, pero puede no encontrar ninguno. Borda es más robusto en la práctica, Condorcet más exigente en teoría.",
      },
      {
        q: "¿Hay que ordenar todas las opciones?",
        a: "Sí, idealmente: una papeleta incompleta falsea los puntos relativos. Ese es el coste real del método y la razón por la que cansa más allá de siete u ocho opciones.",
      },
      {
        q: "¿Por qué el último puesto vale cero?",
        a: "Para que solo cuenten las DIFERENCIAS de rango. Sumar una constante a todos los rangos no cambiaría la clasificación final; partir de cero solo hace la lectura más directa.",
      },
    ],
  },

  condorcet: {
    summary:
      "Se simulan todos los duelos posibles entre opciones. La que los gana todos es el ganador de Condorcet: el verdadero campeón del grupo, inmune al voto útil y muy difícil de manipular.",
    history: [
      "Marie Jean Antoine Nicolas de Caritat, marqués de Condorcet, publica en 1785 su ensayo sobre la aplicación del análisis a la probabilidad de las decisiones tomadas por pluralidad de votos. Matemático, filósofo de las Luces y luego diputado en la Asamblea Legislativa, demuestra que el escrutinio ordinario puede elegir una opción que la mayoría rechazaría en un duelo.",
      "Su propuesta: comparar cada opción con cada otra, de dos en dos, y coronar la que gane siempre. Descubre de paso el obstáculo que llevará su nombre — la paradoja de Condorcet — cuando los duelos giran en círculo.",
      "La idea duerme hasta el siglo XX. Duncan Black la redescubre en « The Theory of Committees and Elections » (1958). Entre tanto, Kenneth Arrow publicó en 1951 su teorema de imposibilidad (Nobel de Economía 1972): ningún método de clasificación colectiva puede satisfacer a la vez unas pocas exigencias muy razonables.",
      "Ramon Llull había descrito un procedimiento por duelos ya a finales del siglo XIII, en manuscritos recuperados solo en 2001: cinco siglos de adelanto sobre Condorcet.",
    ],
    mechanics: [
      "A partir de las clasificaciones se construye la matriz de duelos: para cada par de opciones, cuántas papeletas colocan una por delante de la otra. Al votante no se le pide más que una ordenación.",
      "El ganador de Condorcet es la opción que gana TODOS sus duelos. Cuando existe, es único, y ningún otro método puede pretender representar mejor la preferencia mayoritaria.",
      "Cuando los duelos forman un ciclo (A gana a B, B gana a C, C gana a A) no hay ganador: es la paradoja de Condorcet, una propiedad de las preferencias del grupo y no un fallo del recuento. Placet lo muestra honestamente en lugar de designar a un ganador arbitrario.",
      "Entonces la pregunta se desplaza al conjunto de Smith: el grupo más pequeño de opciones que ganan a todas las excluidas. La variante aleatoria de Placet sortea dentro de él.",
    ],
    example: {
      intro: "Tres opciones, cinco papeletas ordenadas. Se comparan de dos en dos.",
      head: ["Duelo", "Resultado", "Ganador"],
      rows: [
        ["Burdeos vs Lyon", "3 – 2", "Burdeos"],
        ["Burdeos vs Lille", "3 – 2", "Burdeos"],
        ["Lyon vs Lille", "3 – 2", "Lyon"],
      ],
      steps: [
        "Burdeos gana sus dos duelos: es el ganador de Condorcet.",
        "Lyon gana uno de dos, Lille ninguno.",
        "La clasificación final se lee en el número de duelos ganados: Burdeos, Lyon, Lille.",
      ],
      result:
        "Con un escrutinio a una vuelta, Lyon podría haber ganado con sus primeras opciones. El duelo revela que una mayoría prefiere Burdeos: la información que el escrutinio ordinario tira a la basura.",
    },
    useCases: [
      "El proyecto Debian elige a sus responsables por un método de Condorcet (variante Schulze), igual que muchos proyectos libres.",
      "Wikimedia, KDE, Gentoo y varias fundaciones de software lo usan en sus votaciones internas.",
      "Decisiones de equipo comprometidas, donde la legitimidad del resultado cuenta tanto como el resultado.",
      "Cualquier elección donde se sospeche que un compromiso ganaría a favoritos que se anulan entre sí.",
    ],
    limits: [
      {
        t: "Paradoja de Condorcet",
        d: "Los duelos pueden girar en círculo, sin ningún ganador. Raro con preferencias homogéneas, más frecuente en temas polarizados con tres campos.",
      },
      {
        t: "Papeleta más exigente",
        d: "Hay que ordenar, no solo marcar. Más allá de siete u ocho opciones, el cansancio es real y las papeletas se degradan.",
      },
      {
        t: "Recuento opaco",
        d: "La matriz de duelos no se lee de un vistazo. Hay que mostrar bien el resultado, o la legitimidad ganada en teoría se pierde en la práctica.",
      },
      {
        t: "Teorema de Arrow",
        d: "Ningún método cumple todas las condiciones a la vez. Condorcet elige la fidelidad a la preferencia mayoritaria y paga ese precio con la existencia de ciclos.",
      },
    ],
    faq: [
      {
        q: "¿Qué es la paradoja de Condorcet?",
        a: "Una situación en la que las preferencias del grupo giran en círculo: una mayoría prefiere A a B, otra B a C y una tercera C a A. Ninguna opción gana todos sus duelos. No es un error: es una propiedad posible de las preferencias colectivas, aunque cada papeleta por separado sea perfectamente coherente.",
      },
      {
        q: "¿Qué hace Placet en caso de ciclo?",
        a: "Lo anuncia, en vez de fabricar un ganador. La clasificación por duelos ganados sigue mostrándose, pero ninguna decisión se presenta como adquirida. Si aun así quiere decidir, la variante Condorcet aleatorio sortea dentro del conjunto de Smith.",
      },
      {
        q: "¿Se puede manipular un voto de Condorcet?",
        a: "Está entre los más difíciles de manipular. El teorema de Gibbard-Satterthwaite (1973-1975) establece que ningún método no trivial es totalmente inmune, pero manipular Condorcet exige conocer con mucha precisión las intenciones ajenas y se vuelve fácilmente contra su autor.",
      },
      {
        q: "¿Condorcet o juicio mayoritario?",
        a: "Condorcet compara las opciones entre sí; el juicio mayoritario las evalúa en una escala absoluta. Condorcet halla al campeón de los duelos cuando existe; el juicio mayoritario siempre da un resultado y mide el nivel de adhesión.",
      },
    ],
  },

  condorcet_random: {
    summary:
      "Condorcet con una salida: cuando los duelos giran en círculo, el ganador se sortea entre las opciones bloqueadas. Una decisión garantizada, sin arbitrariedad disfrazada.",
    history: [
      "El sorteo no es un mal menor: era el modo de designación ordinario de la democracia ateniense, que atribuía por el kleroterion la mayoría de las magistraturas y reservaba la elección a las funciones técnicas.",
      "Sobrevive en el derecho electoral contemporáneo como desempate: numerosos códigos electorales, entre ellos el francés, resuelven el empate exacto por sorteo o por edad. Varios estados de EE. UU. lo hacen literalmente, sacando una carta o lanzando una moneda.",
      "En teoría de la elección social, la lotería tiene un estatus serio: es el único medio conocido de seguir siendo a la vez neutral entre opciones y anónimo entre votantes cuando las preferencias se bloquean. La aleatorización restaura una equidad que el determinismo no puede ofrecer.",
    ],
    mechanics: [
      "Mientras exista un ganador de Condorcet, esta variante es estrictamente idéntica a Condorcet: el azar nunca interviene.",
      "El sorteo solo entra en juego en caso de ciclo, y no en cualquier sitio: Placet sortea dentro del CONJUNTO DE SMITH, el grupo más pequeño de opciones que ganan a todas las excluidas. Una opción dominada no tiene ninguna posibilidad de ser designada.",
      "El resultado no es reproducible: es el precio de una decisión garantizada. Si hay mucho en juego, más vale anunciar el sorteo al grupo antes de ejecutarlo.",
    ],
    example: {
      intro: "Tres opciones, un ciclo perfecto: el caso de manual de la paradoja.",
      head: ["Duelo", "Resultado", "Ganador"],
      rows: [
        ["Lyon vs Burdeos", "6 – 3", "Lyon"],
        ["Burdeos vs Lille", "6 – 3", "Burdeos"],
        ["Lille vs Lyon", "6 – 3", "Lille"],
      ],
      steps: [
        "Lyon gana a Burdeos, Burdeos a Lille, Lille a Lyon: el ciclo está completo.",
        "Ninguna opción gana todos sus duelos: Condorcet simple se detiene aquí.",
        "Las tres forman el conjunto de Smith; el sorteo designa una, cada una con una posibilidad entre tres.",
      ],
      result:
        "El azar no sustituye al voto: solo decide entre opciones que el grupo ha vuelto estrictamente equivalentes. Cualquier otra regla de desempate introduciría un sesgo que nadie ha votado.",
    },
    useCases: [
      "Decisiones que deben cerrarse hoy sí o sí, sobre un tema polarizado.",
      "Grupos con tres campos netos, donde el ciclo es probable.",
      "Desempate de igualdades perfectas, en lugar de un voto de calidad discutible.",
      "Toda situación donde el bloqueo cuesta más caro que una elección imperfecta.",
    ],
    limits: [
      {
        t: "No reproducible",
        d: "Dos recuentos de las mismas papeletas pueden dar dos ganadores. Hay que anunciarlo ANTES del voto, so pena de una impugnación legítima.",
      },
      {
        t: "Mal aceptado culturalmente",
        d: "« Lo hemos sorteado » sienta mal, incluso cuando es la solución más equitativa. Explicar el bloqueo es indispensable.",
      },
      {
        t: "Oculta información",
        d: "Un ciclo dice algo del grupo: tres campos irreconciliables. El sorteo decide sin que ese diagnóstico se discuta.",
      },
    ],
    faq: [
      {
        q: "¿Interviene siempre el azar?",
        a: "No, casi nunca. Mientras una opción gane todos sus duelos, se declara ganadora exactamente como en Condorcet simple. El sorteo solo existe para los ciclos.",
      },
      {
        q: "¿Qué es el conjunto de Smith?",
        a: "El grupo más pequeño de opciones tal que cada una de sus miembros gana a todas las opciones exteriores. En caso de ciclo es el pelotón de cabeza: el sorteo solo selecciona opciones realmente en carrera.",
      },
      {
        q: "¿Es realmente democrático?",
        a: "Tanto como las alternativas, y más honesto. En caso de ciclo, TODA regla de desempate — el orden alfabético, la antigüedad, el voto del presidente — privilegia a alguien. El sorteo es el único que no favorece a nadie, y solo se aplica entre opciones que el grupo ha dejado empatadas.",
      },
    ],
  },

  majority_judgment: {
    summary:
      "Cada opción recibe una mención (de « a rechazar » a « muy bien ») y decide la mención MEDIANA. Un método concebido para resistir al voto táctico.",
    history: [
      "El juicio mayoritario lo proponen en 2007 Michel Balinski y Rida Laraki, investigadores de la École polytechnique y del CNRS, en los Proceedings of the National Academy of Sciences. Su libro de referencia, « Majority Judgment: Measuring, Ranking, and Electing », aparece en MIT Press en 2011.",
      "La inspiración viene de fuera de la política: los concursos de vino, la gimnasia y el patinaje artístico puntúan desde hace mucho en escalas verbales y descartan los extremos, porque la media es demasiado fácil de manipular por un juez aislado.",
      "Los autores lo experimentan en abril de 2007 con los electores de Orsay durante la presidencial francesa, en paralelo al escrutinio oficial. Desde entonces varias primarias ciudadanas francesas lo han empleado, entre ellas la Primaire populaire en 2022.",
    ],
    mechanics: [
      "El votante atribuye una mención a CADA opción, independientemente de las demás: evalúa, no ordena. Dos opciones pueden recibir la misma mención.",
      "Para cada opción se ordenan las menciones recibidas y se toma la mediana: la mención tal que una mayoría la juzga « al menos así de buena » y una mayoría « como mucho así de buena ». A diferencia de la media, la mediana es insensible a las notas extremas depositadas por táctica.",
      "En caso de empate de medianas, se desempata retirando una a una las menciones medianas de las opciones empatadas hasta que divergen. Equivale a comparar las proporciones de partidarios y opositores alrededor de la mención mediana.",
    ],
    example: {
      intro: "Tres opciones juzgadas por once personas en una escala de cinco menciones.",
      head: ["Opción", "Menciones recibidas", "Mediana"],
      rows: [
        ["Burdeos", "3 Muy bien, 5 Bien, 3 Aceptable", "Bien"],
        ["Lyon", "5 Muy bien, 1 Bien, 5 A rechazar", "Bien"],
        ["Lille", "2 Muy bien, 4 Aceptable, 5 Insuficiente", "Aceptable"],
      ],
      steps: [
        "Burdeos y Lyon tienen la misma mención mediana: Bien.",
        "Se retira una mención mediana a cada una y se repite: Burdeos conserva una base más amplia por encima de Bien.",
        "Lyon, muy divisiva (5 « Muy bien » pero 5 « A rechazar »), queda por detrás.",
      ],
      result:
        "El juicio mayoritario prefiere la opción ampliamente estimada a la que polariza. Un escrutinio a una vuelta habría coronado a Lyon con sus cinco entusiastas.",
    },
    useCases: [
      "Elecciones internas y primarias ciudadanas, donde se quiere medir la adhesión real.",
      "Evaluación de candidaturas, proyectos o proveedores con criterios cualitativos.",
      "Decisiones donde se quiere detectar la opción divisiva antes de adoptarla.",
      "Toda votación donde la intensidad del apoyo, y no solo su existencia, deba pesar.",
    ],
    limits: [
      {
        t: "Incumple el criterio de Condorcet",
        d: "Una opción que gana todos sus duelos puede no tener la mejor mediana. Ambos métodos miden cosas distintas y no se pueden tener las dos (teorema de Arrow).",
      },
      {
        t: "Calibrado de las menciones",
        d: "El sentido de « Aceptable » varía de una persona a otra. La escala debe explicitarse antes del voto, o se suman juicios incomparables.",
      },
      { t: "Papeleta más larga", d: "Una mención por opción es más que una marca, y se nota más allá de una decena de opciones." },
      { t: "Desempate técnico", d: "La regla de empate por retirada de medianas es rigurosa pero difícil de explicar en una reunión." },
    ],
    faq: [
      {
        q: "¿Por qué la mediana y no la media?",
        a: "Porque la media se compra. Un votante táctico que pone la nota mínima al competidor serio desplaza mucho su media; solo desplaza la mediana un escalón, y solo si son muchos los que lo hacen. La mediana es el corazón del método, no un detalle de cálculo.",
      },
      {
        q: "¿Es realmente inmanipulable?",
        a: "No: el teorema de Gibbard-Satterthwaite lo prohíbe para todo método. Pero el juicio mayoritario limita netamente la ganancia esperada de un voto insincero, que es lo mejor que se puede demostrar.",
      },
      {
        q: "¿Cuántas menciones hacen falta?",
        a: "Cinco o seis, con etiquetas verbales claras. Menos, y se pierde el matiz; más, y los votantes ya no distinguen los escalones vecinos.",
      },
    ],
  },

  proportional: {
    summary:
      "En vez de un ganador único, se reparten escaños en proporción a los votos con el método D'Hondt. Es el escrutinio de las asambleas, no de las decisiones.",
    history: [
      "El jurista belga Victor d'Hondt publica su método en 1878; Bélgica se convierte en 1899 en el primer país en aplicarlo a elecciones nacionales. La fórmula ya se conocía: Thomas Jefferson la había propuesto en 1792 para repartir los escaños de la Cámara de Representantes entre los estados.",
      "Existen variantes rivales desde hace igual de tiempo: Sainte-Laguë (1910), equivalente al método Webster de 1832, reparte de forma más favorable a las pequeñas formaciones y sigue siendo la referencia en Escandinavia y Nueva Zelanda.",
      "El método de los restos mayores, llamado de Hamilton, fue abandonado en Estados Unidos tras la paradoja de Alabama: en 1880 se constató que aumentar el total de escaños de 299 a 300 HACÍA PERDER un escaño a Alabama. Estados Unidos usa desde 1941 el método Huntington-Hill.",
    ],
    mechanics: [
      "Para cada lista se calcula la serie de cocientes votos/1, votos/2, votos/3… Los escaños van a los mayores cocientes, sumando todas las listas, hasta agotarlos.",
      "Esta regla de las mayores medias favorece ligeramente a las listas grandes, de manera sistemática y conocida: es una opción política a favor de la gobernabilidad, no un artefacto de cálculo.",
      "Un umbral de elegibilidad (5 % en Alemania, 3 % en las europeas francesas) descarta las listas muy pequeñas antes del reparto, para evitar la fragmentación.",
    ],
    example: {
      intro: "Cien votos, cinco escaños a repartir entre tres listas por el método D'Hondt.",
      head: ["Lista", "Votos", "÷1", "÷2", "÷3"],
      rows: [
        ["A", "45", "45", "22,5", "15"],
        ["B", "35", "35", "17,5", "11,7"],
        ["C", "20", "20", "10", "6,7"],
      ],
      steps: [
        "Los cinco mayores cocientes de todas las listas: 45 (A), 35 (B), 22,5 (A), 20 (C), 17,5 (B).",
        "Reparto final: A 2 escaños, B 2 escaños, C 1 escaño.",
        "A obtiene el 40 % de los escaños con el 45 % de los votos; C, el 20 % de los escaños con el 20 % de los votos.",
      ],
      result:
        "Con tan pocos escaños, la proporcionalidad es forzosamente burda: es el número de escaños, mucho más que la fórmula, lo que determina la finura de la representación.",
    },
    useCases: [
      "Elecciones legislativas en la mayoría de las democracias europeas.",
      "Elecciones europeas, y regionales francesas en su parte proporcional.",
      "Composición de un consejo de administración o de una junta asociativa.",
      "Reparto de presupuestos o de franjas entre grupos, en proporción a los apoyos.",
    ],
    limits: [
      {
        t: "No es una decisión",
        d: "La proporcional compone una asamblea. Para zanjar una cuestión hace falta después una votación: la herramienta no sustituye a la decisión.",
      },
      {
        t: "Prima a las listas grandes",
        d: "D'Hondt redondea sistemáticamente a favor de las mayores. Sainte-Laguë es más neutral, si es eso lo que busca.",
      },
      {
        t: "Umbrales y fragmentación",
        d: "Sin umbral, la asamblea se vuelve ingobernable; con umbral, hay votos que dejan de estar representados.",
      },
      {
        t: "Paradojas de reparto",
        d: "La paradoja de Alabama mostró que ningún método de reparto está exento de comportamientos contraintuitivos.",
      },
    ],
    faq: [
      {
        q: "¿D'Hondt o Sainte-Laguë?",
        a: "D'Hondt (cocientes por 1, 2, 3…) favorece ligeramente a las listas grandes y facilita las mayorías. Sainte-Laguë (por 1, 3, 5…) es más fiel a las pequeñas. La elección es política y debe hacerse antes del voto, nunca después.",
      },
      {
        q: "¿Por qué mis porcentajes de escaños no coinciden con los votos?",
        a: "Porque un escaño es indivisible. Con cinco escaños, la granularidad mínima es del 20 %: ninguna fórmula puede hacerlo mejor. La diferencia se estrecha a medida que aumenta el número de escaños.",
      },
      {
        q: "¿Se puede usar entre pocas personas?",
        a: "Sí, para repartir recursos: franjas, un presupuesto, plazas. Para elegir entre opciones, use más bien la aprobación o Condorcet.",
      },
    ],
  },

  list: {
    summary:
      "Se vota por una lista entera; la que llega primera recibe de oficio la mitad de los escaños y el resto se reparte proporcionalmente. Es el escrutinio de las municipales francesas.",
    history: [
      "El escrutinio de lista con prima mayoritaria se fija para los municipios franceses de 3 500 habitantes o más por la ley del 19 de noviembre de 1982, que pone fin al escrutinio mayoritario de lista integral e introduce una dosis de proporcionalidad.",
      "La misma ley crea el régimen particular de París, Lyon y Marsella (llamado PLM), con elecciones por sectores, mecanismo que ha producido varias veces un alcalde elegido sin encabezar los votos de la ciudad.",
      "El principio se extendió a las elecciones regionales, con una prima reducida al 25 % de los escaños, por las reformas de 1999 y 2003. La lógica es constante: arbitrar explícitamente entre representatividad y capacidad de gobernar.",
    ],
    mechanics: [
      "Cada votante elige una lista, sin mezclar. La lista más votada recibe inmediatamente el 50 % de los escaños: es la prima mayoritaria.",
      "El 50 % restante se reparte proporcionalmente entre TODAS las listas que superen el umbral, incluida la primera, que obtiene así bastante más que su parte de votos.",
      "En las municipales hay segunda vuelta si ninguna lista alcanza la mayoría absoluta, con posibilidad de fusión entre listas clasificadas, de ahí la importancia de las negociaciones entre vueltas.",
    ],
    example: {
      intro: "Veinte escaños a cubrir, tres listas, prima mayoritaria del 50 %.",
      head: ["Lista", "Votos", "Prima", "Proporcional", "Total"],
      rows: [
        ["A", "45 %", "10", "4", "14"],
        ["B", "35 %", "0", "4", "4"],
        ["C", "20 %", "0", "2", "2"],
      ],
      steps: [
        "La lista A, en cabeza, recibe de entrada 10 escaños de 20.",
        "Los 10 escaños restantes se reparten proporcionalmente entre las tres listas.",
        "A totaliza 14 escaños de 20, es decir el 70 % de la asamblea con el 45 % de los votos.",
      ],
      result:
        "La distorsión no es un defecto: es el objeto mismo del mecanismo. Una mayoría de gestión emerge la noche electoral, al precio asumido de infrarrepresentar a las demás listas.",
    },
    useCases: [
      "Elecciones municipales francesas en municipios de 1 000 habitantes o más.",
      "Elecciones regionales, con una prima del 25 %.",
      "Elección de una junta o un consejo con listas competidoras.",
      "Toda asamblea que deba ser a la vez representativa y capaz de decidir.",
    ],
    limits: [
      {
        t: "Distorsión buscada",
        d: "Una lista minoritaria en votos se vuelve mayoritaria en escaños. Es el contrato del mecanismo, a condición de anunciarlo.",
      },
      { t: "Sin mezcla", d: "Se toma una lista en bloque. El votante no puede aprobar a una persona sin aprobar a todo el equipo." },
      { t: "El peso de las fusiones", d: "Entre las dos vueltas, lo esencial se juega en la negociación, fuera de la mirada de los votantes." },
    ],
    faq: [
      {
        q: "¿Por qué una prima mayoritaria?",
        a: "Para evitar consejos ingobernables. Sin ella, un municipio puede pasar seis años sin mayoría estable. Es una opción de gobernabilidad, pagada en representatividad.",
      },
      {
        q: "¿La lista más votada recibe también la proporcional?",
        a: "Sí. Recibe la prima Y su parte proporcional de los escaños restantes, lo que explica que alcance a menudo el 70 % de la asamblea.",
      },
      {
        q: "¿Útil fuera del contexto municipal?",
        a: "Cada vez que elija un equipo que deberá funcionar junto, más que individuos independientes. Para simples opciones, es desproporcionado.",
      },
    ],
  },

  grand_electors: {
    summary:
      "Los votantes se reparten en circunscripciones; cada una designa a un campeón local que se lleva todos sus compromisarios. El ganador del voto popular puede perder.",
    history: [
      "El colegio electoral estadounidense nace del compromiso constitucional de 1787: los constituyentes no querían ni una elección por el Congreso ni un voto popular directo que juzgaban arriesgado. Cada estado recibe un número de compromisarios igual a su representación en el Congreso.",
      "La regla del « winner-take-all » a escala del estado no está en la Constitución: la adoptaron progresivamente los propios estados, para maximizar su peso. Maine y Nebraska aún se apartan de ella.",
      "En Francia, el Senado se elige por sufragio indirecto mediante unos 162 000 grandes electores, mayoritariamente delegados de los concejos municipales, lo que explica estructuralmente su sobrerrepresentación de los municipios rurales.",
    ],
    mechanics: [
      "Se reparten los votantes en circunscripciones, cada una dotada de un número de compromisarios. En Placet, ese reparto y esa ponderación se ajustan libremente.",
      "Cada circunscripción organiza su propio recuento — el método local es a elección — y atribuye sus compromisarios al ganador local, en bloque o proporcionalmente.",
      "El total de compromisarios designa al ganador. Ese total no depende del número de votos, sino de su DISTRIBUCIÓN geográfica: ahí está toda la diferencia.",
    ],
    example: {
      intro: "Tres circunscripciones, 100 votantes, 10 compromisarios cada una.",
      head: ["Circunscripción", "A", "B", "Compromisarios"],
      rows: [
        ["Norte", "18", "15", "10 para A"],
        ["Centro", "17", "16", "10 para A"],
        ["Sur", "4", "30", "10 para B"],
      ],
      steps: [
        "A gana el Norte y el Centro por poco: 20 compromisarios.",
        "B arrasa en el Sur: 10 compromisarios.",
        "En total de votos: A 39, B 61. B tiene 22 votos de ventaja y pierde la elección.",
      ],
      result:
        "Los votos excedentes de B en el Sur se pierden. Ese fenómeno — concentrar los apoyos es ineficaz — está en el centro de todas las críticas al escrutinio indirecto y al gerrymandering.",
    },
    useCases: [
      "Elección presidencial estadounidense.",
      "Elección del Senado francés por los grandes electores.",
      "Federaciones, confederaciones y grupos de empresas que votan por entidades.",
      "Toda organización donde los componentes deban pesar como tales, no solo por su tamaño.",
    ],
    limits: [
      {
        t: "Ganador del voto popular derrotado",
        d: "Ha ocurrido cuatro veces en Estados Unidos: 1876, 1888, 2000 y 2016. No es un accidente del sistema, sino una consecuencia directa de su lógica.",
      },
      {
        t: "Votos de peso desigual",
        d: "Un elector de un estado pequeño pesa varias veces lo que uno de un estado grande, por construcción.",
      },
      {
        t: "Gerrymandering",
        d: "Quien traza las fronteras influye en el resultado tanto como los votantes. El término viene de Elbridge Gerry, en 1812.",
      },
      { t: "Campaña concentrada", d: "Solo cuentan las circunscripciones indecisas; ambos campos ignoran las demás." },
    ],
    faq: [
      {
        q: "¿Cómo se pierde con más votos?",
        a: "Ganando las circunscripciones equivocadas. Los votos por encima del umbral de victoria local no sirven de nada: más vale ganar tres circunscripciones por un voto que arrasar en una por mil.",
      },
      {
        q: "¿Para qué sirve fuera de la política?",
        a: "Para hacer pesar a entidades en vez de a individuos: filiales de un grupo, secciones de una federación, delegaciones de una asociación. Cada una habla con una voz, sea cual sea su tamaño.",
      },
      {
        q: "¿Se pueden repartir de otro modo que en bloque?",
        a: "Sí. Placet permite un reparto proporcional de los compromisarios de cada circunscripción, lo que atenúa mucho las distorsiones: es la opción de Maine y Nebraska.",
      },
    ],
  },

  // ----------------------------------------------------------- ASIGNACIÓN ----
  serial_dictatorship: {
    summary:
      "Se fija un orden de paso, a menudo por sorteo, y cada cual toma por turno lo que prefiere entre lo que queda. Sencillo, incontestable y honesto: mentir nunca sirve.",
    history: [
      "El procedimiento es tan viejo como el reparto, pero la teoría de la elección social lo formalizó con el nombre de « dictadura serial »: en cada etapa una persona decide sola, de ahí el término, que describe el algoritmo y no un régimen.",
      "Estructura los drafts deportivos norteamericanos desde 1947 (NBA), con un orden invertido de la clasificación para reequilibrar los equipos; la lotería del draft, introducida en 1985, añade azar para desalentar las derrotas voluntarias.",
      "Los economistas lo estudiaron en el marco del problema de asignación de viviendas (Hylland y Zeckhauser, 1979). Establecen que es uno de los raros mecanismos a la vez eficiente y no manipulable.",
    ],
    mechanics: [
      "Se fija un orden de paso. El sorteo es la opción por defecto, porque cualquier otro orden debe justificarse: la antigüedad, la necesidad y el mérito son legítimos, pero son decisiones políticas.",
      "Cada cual, en su turno, toma su opción preferida entre las disponibles. Basta una sola pasada; el resultado es inmediato y verificable línea a línea.",
      "Dos propiedades demostradas: el resultado es Pareto-eficiente (ninguna reorganización puede mejorar a alguien sin perjudicar a otro) y el mecanismo es no manipulable (declarar las preferencias verdaderas siempre es óptimo).",
    ],
    example: {
      intro: "Cuatro personas, cuatro misiones, orden sorteado: Chloé, Ali, Bruno, Dana.",
      head: ["Persona", "1ª opción", "2ª opción", "Obtiene"],
      rows: [
        ["Chloé", "Auditoría", "Rediseño", "Auditoría"],
        ["Ali", "Auditoría", "Soporte", "Soporte"],
        ["Bruno", "Rediseño", "Auditoría", "Rediseño"],
        ["Dana", "Soporte", "Formación", "Formación"],
      ],
      steps: [
        "Chloé pasa primera y toma Auditoría, su primera opción.",
        "Ali quería Auditoría: ya no está disponible, toma Soporte, su segunda opción.",
        "Bruno obtiene Rediseño, su primera opción; queda Formación para Dana.",
      ],
      result:
        "Tres personas de cuatro obtienen su primera opción. La calidad del resultado depende enteramente del sorteo: por eso el orden debe anunciarse y ser verificable antes de la asignación.",
    },
    useCases: [
      "Reparto de misiones, franjas, despachos o material en un equipo.",
      "Drafts deportivos y selección de jugadores.",
      "Atribución de habitaciones en residencias o pisos compartidos.",
      "Elección de temas de prácticas o de trabajo fin de estudios entre estudiantes.",
    ],
    limits: [
      {
        t: "Desigualdad de rango",
        d: "El primero casi siempre logra su deseo, el último casi nunca. En turnos repetidos hay que rotar el orden.",
      },
      {
        t: "Sin ausencia de envidia",
        d: "El último servido puede envidiar legítimamente al primero. La eficiencia no garantiza la ausencia de resquemor.",
      },
      {
        t: "Ignora la intensidad",
        d: "Un deseo vital y uno tibio pesan igual. Si la urgencia cuenta, la satisfacción máxima encaja mejor.",
      },
    ],
    faq: [
      {
        q: "¿Hay que sortear el orden?",
        a: "Es la opción por defecto más defendible, porque no exige ninguna justificación. Cualquier otro orden — antigüedad, necesidad, mérito — es un arbitraje que asumir públicamente antes de la asignación, nunca después.",
      },
      {
        q: "¿Me interesa mentir sobre mis preferencias?",
        a: "No, nunca, y está demostrado. Cuando llega su turno toma la mejor opción restante: declarar otra cosa solo puede perjudicarle. Es lo que se llama un mecanismo no manipulable.",
      },
      {
        q: "¿Turno de elección o satisfacción máxima?",
        a: "El turno de elección es transparente e incontestable, pero depende del sorteo. La satisfacción máxima optimiza el total del grupo, al precio de un cálculo que nadie puede rehacer de cabeza. Elija según lo que el grupo deba aceptar: la claridad o el óptimo.",
      },
    ],
  },

  optimal_sum: {
    summary:
      "En lugar de servir a las personas una tras otra, se busca la asignación que minimiza la suma de los rangos obtenidos. El mejor resultado colectivo posible, calculado de una vez.",
    history: [
      "Es el « problema de asignación », un clásico de la investigación operativa. Harold Kuhn publica en 1955 una solución eficiente que bautiza « algoritmo húngaro », en homenaje a los trabajos de los matemáticos húngaros Dénes Kőnig y Jenő Egerváry en los que se inspira.",
      "Más tarde se descubrió que Carl Gustav Jacobi había resuelto el problema en el siglo XIX, en trabajos publicados póstumamente en 1890, sesenta y cinco años antes de su redescubrimiento.",
      "El algoritmo es hoy una herramienta industrial corriente: asignación de tripulaciones a vuelos, de tareas a máquinas, de vehículos a trayectos. Toda aplicación que empareja dos conjuntos optimizando un coste total es su heredera.",
    ],
    mechanics: [
      "Cada persona ordena las opciones. Un deseo de rango 1 cuesta 1, uno de rango 2 cuesta 2, y así sucesivamente: se construye la matriz de costes.",
      "Se busca la asignación que minimiza el coste TOTAL, explorando todas las combinaciones posibles de forma inteligente, nunca una a una, lo que sería inabordable.",
      "Consecuencia importante: el cálculo puede sacrificar a una persona para aliviar a varias. El óptimo es colectivo, y es exactamente lo que se le pide.",
    ],
    example: {
      intro: "Tres personas, tres misiones. Las casillas dan el rango del deseo.",
      head: ["", "Auditoría", "Rediseño", "Soporte"],
      rows: [
        ["Chloé", "1", "2", "3"],
        ["Ali", "1", "3", "2"],
        ["Bruno", "2", "1", "3"],
      ],
      steps: [
        "Servir a todos su primer deseo es imposible: Chloé y Ali apuntan a Auditoría.",
        "Chloé→Auditoría, Bruno→Rediseño, Ali→Soporte: coste total 1 + 1 + 2 = 4.",
        "Ali→Auditoría, Bruno→Rediseño, Chloé→Soporte: coste total 1 + 1 + 3 = 5.",
      ],
      result:
        "Se retiene la primera combinación: a igualdad de deseos, cuesta menos al grupo. Ningún otro arreglo baja de 4.",
    },
    useCases: [
      "Repartir misiones o expedientes en un equipo maximizando la satisfacción global.",
      "Asignar alumnos a talleres, optativas o proyectos.",
      "Atribuir turnos de guardia o de disponibilidad.",
      "Planificar tripulaciones, rutas o máquinas: el uso industrial histórico.",
    ],
    limits: [
      {
        t: "Manipulable",
        d: "A diferencia del turno de elección, mentir puede salir rentable: colocar bajo una opción muy demandada puede conseguirle una mejor. El método no está a prueba de estrategia.",
      },
      {
        t: "Óptimo colectivo, no individual",
        d: "Alguien puede recibir su último deseo para que la suma baje. Matemáticamente óptimo y humanamente difícil de anunciar.",
      },
      {
        t: "Difícil de verificar",
        d: "Nadie puede rehacer el cálculo de cabeza. La confianza reposa en la herramienta, lo que debilita la legitimidad percibida.",
      },
      {
        t: "Rangos tratados como distancias",
        d: "La diferencia entre el 1º y el 2º deseo se cuenta igual que entre el 4º y el 5º, aunque no se viven igual en absoluto.",
      },
    ],
    faq: [
      {
        q: "¿En qué es mejor que el turno de elección?",
        a: "De media, el grupo está más satisfecho: el algoritmo ve todas las combinaciones de una vez, mientras que el turno de elección sufre el orden de paso. El precio es la legibilidad, y la posibilidad de mentir.",
      },
      {
        q: "¿Qué pasa si dos asignaciones empatan?",
        a: "Varias soluciones pueden alcanzar el mismo coste mínimo; se retiene una. Si hay mucho en juego, anuncie de antemano la regla de desempate, o pase al turno de elección, cuya mecánica es reproducible.",
      },
      {
        q: "¿Hacen falta tantas plazas como personas?",
        a: "No, pero la diferencia se paga: si faltan plazas, alguien no será asignado; si sobran, algunas quedarán vacías. El cálculo sigue siendo válido en ambos casos.",
      },
    ],
  },

  top_trading_cycles: {
    summary:
      "Cada cual posee ya algo y querría algo mejor. Se buscan los bucles de intercambio donde todo el mundo mejora y se ejecutan. Nadie puede salir perdiendo.",
    history: [
      "Lloyd Shapley y Herbert Scarf publican en 1974, en el Journal of Mathematical Economics, el artículo fundador sobre el « housing market ». Atribuyen el algoritmo de los ciclos de intercambio más altos a David Gale y demuestran que produce siempre una asignación en el núcleo del mercado.",
      "Atila Abdulkadiroğlu y Tayfun Sönmez lo extienden en 1999 a situaciones mixtas, donde algunos ocupantes ya están instalados y otros llegan: el caso concreto de las residencias universitarias estadounidenses.",
      "Su aplicación más espectacular es médica: los programas de intercambio de riñones entre parejas donante-receptor incompatibles, formalizados por Roth, Sönmez y Ünver a principios de los años 2000, reposan en esta mecánica de ciclos. Alvin Roth y Lloyd Shapley reciben el Nobel de Economía 2012 por el conjunto de estos trabajos.",
    ],
    mechanics: [
      "Cada cual parte con una dotación: su misión actual, su despacho, su franja. El número de personas y de bienes debe por tanto ser igual.",
      "Cada cual señala el bien que prefiere. Se siguen las flechas: acaban siempre formando al menos un ciclo, eventualmente un bucle sobre sí mismo cuando alguien ya tiene lo que prefiere.",
      "Los ciclos se ejecutan: cada cual recibe lo que señalaba. Las personas servidas salen con su bien y se vuelve a empezar con las demás, hasta agotarlas.",
      "Tres propiedades demostradas: el resultado es Pareto-eficiente, individualmente racional (nadie sale con algo peor que su dotación) y el mecanismo es no manipulable.",
    ],
    example: {
      intro: "Tres personas, cada una con una franja, cada una queriendo otra.",
      head: ["Persona", "Franja actual", "Franja deseada", "Obtiene"],
      rows: [
        ["Chloé", "Lunes", "Martes", "Martes"],
        ["Ali", "Martes", "Lunes", "Lunes"],
        ["Bruno", "Miércoles", "Miércoles", "Miércoles"],
      ],
      steps: [
        "Chloé señala la franja de Ali, Ali señala la de Chloé: es un ciclo de longitud 2.",
        "El ciclo se ejecuta: ambos intercambian y salen satisfechos.",
        "Bruno señala su propia franja: bucle sobre sí mismo, la conserva.",
      ],
      result:
        "Dos intercambios, ningún perdedor. Es la garantía central del método: nunca se puede salir peor de lo que se entró.",
    },
    useCases: [
      "Intercambiar turnos de guardia, disponibilidades o días de vacaciones.",
      "Reasignar despachos, material o plazas de aparcamiento ya ocupados.",
      "Permutar misiones o carteras de clientes dentro de un equipo.",
      "Intercambios de riñones entre parejas incompatibles: la aplicación que valió un Nobel.",
    ],
    limits: [
      {
        t: "Exige una dotación inicial",
        d: "Sin punto de partida, el método no tiene sentido. Para una primera atribución, use el turno de elección.",
      },
      { t: "Solo intercambios", d: "Ningún bien se crea ni se suprime: se redistribuye lo existente, ni más ni menos." },
      { t: "Efectivos estrictamente iguales", d: "Tantos bienes como personas, o la mecánica de ciclos se rompe." },
    ],
    faq: [
      {
        q: "¿Puedo perder respecto a mi situación actual?",
        a: "No, nunca, y está demostrado: la racionalidad individual es una propiedad probada del algoritmo. Si ningún intercambio le conviene, conserva su dotación: es el bucle sobre sí mismo.",
      },
      {
        q: "¿Me interesa declarar un orden de preferencias falso?",
        a: "No. El mecanismo es no manipulable: mentir no puede mejorar su resultado y puede hacerle perder un ciclo que le convenía.",
      },
      {
        q: "¿Y si nadie quiere intercambiar?",
        a: "Todo el mundo señala su propio bien, todos los ciclos son bucles y nada se mueve. El resultado es válido: dice que el reparto actual ya es óptimo.",
      },
    ],
  },

  stable_roommates: {
    summary:
      "Los participantes se clasifican entre sí y se emparejan de dos en dos, sin lado que propone ni lado que dispone. Ninguna pareja debe preferir dejarse mutuamente.",
    history: [
      "El problema lo plantean en 1962 David Gale y Lloyd Shapley, al final de su artículo fundador sobre el matrimonio estable: ¿y si, en vez de dos grupos distintos, todo el mundo perteneciera al mismo conjunto? Señalan que su algoritmo no se aplica y dejan la cuestión abierta.",
      "Demuestran de paso que un emparejamiento estable puede sencillamente NO EXISTIR, diferencia esencial con el matrimonio estable, donde siempre existe alguno.",
      "Robert Irving publica en 1985 el primer algoritmo en tiempo polinómico: determina si existe una solución estable y la construye en su caso, en dos fases, la segunda de las cuales elimina metódicamente « rotaciones ».",
    ],
    mechanics: [
      "Cada cual clasifica a TODOS los demás participantes. Solo hay un grupo, así que ninguna asimetría entre proponentes y receptores.",
      "Primera fase: cada cual propone al mejor clasificado que aún no le ha rechazado; las propuestas que mejoran se aceptan provisionalmente, las peores se rechazan. Se obtiene una tabla reducida.",
      "Segunda fase: se detectan y suprimen las rotaciones — cadenas de preferencias cíclicas que impiden la estabilidad — hasta que cada cual no tenga más que un compañero, o hasta que la tabla se vacíe, lo que prueba la ausencia de solución.",
      "El emparejamiento obtenido es estable: ninguna pareja de personas no emparejadas entre sí se prefiere mutuamente a su compañero actual.",
    ],
    example: {
      intro: "Cuatro personas a emparejar, cada una habiendo clasificado a las otras tres.",
      head: ["Persona", "1º", "2º", "3º"],
      rows: [
        ["Chloé", "Ali", "Bruno", "Dana"],
        ["Ali", "Chloé", "Dana", "Bruno"],
        ["Bruno", "Dana", "Chloé", "Ali"],
        ["Dana", "Bruno", "Ali", "Chloé"],
      ],
      steps: [
        "Chloé y Ali se colocan mutuamente en primer lugar: la pareja se impone.",
        "Bruno y Dana hacen lo mismo: segunda pareja.",
        "Ninguna pareja exterior se prefiere mutuamente: el emparejamiento es estable.",
      ],
      result:
        "Aquí las preferencias encajan perfectamente. Modifique una sola clasificación y el emparejamiento estable puede desaparecer por completo: es la fragilidad propia de este problema.",
    },
    useCases: [
      "Constituir parejas de trabajo, de revisión o de pair programming.",
      "Atribuir compañeros de piso o de habitación.",
      "Emparejar compañeros de entrenamiento o de torneo.",
      "Organizar mentoría entre iguales, sin jerarquía entre los dos papeles.",
    ],
    limits: [
      {
        t: "Puede no tener solución",
        d: "A diferencia del matrimonio estable, la estabilidad no está garantizada. Es un resultado demostrado, no una debilidad de la implementación.",
      },
      { t: "Efectivo par obligatorio", d: "Con un número impar, alguien se queda solo por construcción." },
      {
        t: "Clasificación completa exigente",
        d: "Cada cual debe clasificar a todos los demás: el coste sube rápido con el tamaño y clasificar a los colegas no es socialmente anodino.",
      },
    ],
    faq: [
      {
        q: "¿Qué pasa si no existe ninguna solución estable?",
        a: "La herramienta lo dice claramente. Es información real sobre el grupo: las preferencias forman un ciclo irreductible. Le toca ajustar: emparejar por afinidad declarada o aceptar una inestabilidad asumida.",
      },
      {
        q: "¿Qué diferencia hay con Gale-Shapley de dos grupos?",
        a: "Gale-Shapley supone dos conjuntos distintos que se clasifican mutuamente (candidatos y formaciones) y garantiza siempre una solución. Aquí todo el mundo está en el mismo conjunto, no hay lado favorecido, pero desaparece la garantía de existencia.",
      },
      {
        q: "¿Qué significa exactamente « estable »?",
        a: "Que no existe ninguna pareja de personas que, sin estar emparejadas entre sí, se prefirieran mutuamente a su compañero actual. Tal pareja abandonaría el dispositivo: es precisamente lo que la estabilidad impide.",
      },
    ],
  },

  gale_shapley: {
    summary:
      "Dos grupos se clasifican mutuamente: candidatos y formaciones, mentorados y mentores. La aceptación diferida produce siempre un emparejamiento estable. Es el principio de Parcoursup.",
    history: [
      "David Gale y Lloyd Shapley publican en 1962 « College Admissions and the Stability of Marriage » en el American Mathematical Monthly. Demuestran que un emparejamiento estable entre dos grupos existe SIEMPRE y dan un algoritmo simple para construirlo: la aceptación diferida.",
      "Golpe de efecto histórico: el National Resident Matching Program, que asigna desde 1952 a los residentes médicos estadounidenses a los hospitales, ya usaba un algoritmo equivalente, descubierto empíricamente diez años antes de su teorización. Alvin Roth lo demuestra en 1984 y dirige su refundición de 1998 para tratar el caso de las parejas.",
      "Roth y Shapley reciben el Nobel de Economía 2012 por la teoría de las asignaciones estables y el diseño de mercados. En Francia, Parcoursup aplica este principio desde 2018, en sustitución de APB, con un contestador automático que hace las veces de aceptación diferida.",
    ],
    mechanics: [
      "Dos grupos distintos se clasifican mutuamente. El lado 1 propone, el lado 2 dispone, y cada entrada del lado 2 puede tener una capacidad de varias plazas.",
      "Cada proponente solicita su primera opción. Cada receptor retiene provisionalmente a los mejores candidatos dentro de su capacidad y descarta a los demás. Nada es definitivo: ese es todo el sentido de la aceptación DIFERIDA.",
      "Los candidatos descartados proponen a su siguiente opción, lo que puede desplazar a un candidato retenido provisionalmente, que vuelve a proponer. Se para cuando nadie tiene ya ninguna propuesta que hacer.",
      "El resultado es estable: ninguna pareja candidato-formación se preferiría mutuamente a su asignación. Además es ÓPTIMO para el lado que propone: entre todos los emparejamientos estables, cada proponente obtiene el mejor posible.",
    ],
    example: {
      intro: "Tres candidatos, tres formaciones de una plaza cada una, clasificaciones cruzadas.",
      head: ["Candidato", "Deseos", "Formación", "Clasificación"],
      rows: [
        ["Chloé", "A, B, C", "A", "Ali, Chloé, Bruno"],
        ["Ali", "A, C, B", "B", "Chloé, Bruno, Ali"],
        ["Bruno", "B, A, C", "C", "Bruno, Chloé, Ali"],
      ],
      steps: [
        "Vuelta 1: Chloé y Ali proponen a A, Bruno a B. A prefiere a Ali y descarta a Chloé; B retiene a Bruno.",
        "Vuelta 2: Chloé propone a B. B prefiere a Chloé antes que a Bruno y permuta: Bruno queda desplazado.",
        "Vuelta 3: Bruno propone a A, que conserva a Ali; luego a C, que le acepta. Fin: Ali→A, Chloé→B, Bruno→C.",
      ],
      result:
        "Bruno fue retenido y luego desplazado: es la mecánica del diferido y la razón por la que los resultados de Parcoursup se mueven durante semanas. El resultado final es estable.",
    },
    useCases: [
      "Parcoursup y las asignaciones postbachillerato francesas.",
      "Residencia médica estadounidense (NRMP) desde 1952.",
      "Asignación de alumnos a centros en Nueva York y Boston, refundida por Roth y sus colegas.",
      "Programas de mentoría, prácticas y atribución de proyectos entre dos poblaciones distintas.",
    ],
    limits: [
      {
        t: "Asimetría estructural",
        d: "El lado que propone obtiene el mejor emparejamiento estable posible; el otro, el peor. Decidir quién propone es por tanto una decisión política, no técnica.",
      },
      {
        t: "No manipulable de un solo lado",
        d: "Clasificar sinceramente es óptimo para los proponentes, está demostrado. El lado receptor sí puede ganar a veces clasificando tácticamente.",
      },
      { t: "Personas sin asignar", d: "Si faltan plazas, algunos se quedan sin asignación. El algoritmo no las crea." },
      {
        t: "Angustia de la espera",
        d: "Las asignaciones provisionales se mueven hasta el final. Matemáticamente sano, socialmente duro: Parcoursup lo experimenta cada verano.",
      },
    ],
    faq: [
      {
        q: "¿Por qué cambia mi asignación sobre la marcha?",
        a: "Porque la aceptación es diferida: se le reserva una plaza provisionalmente y un candidato mejor clasificado puede desplazarle, igual que usted puede desplazar a otro en otro sitio. El proceso solo se fija al final, y eso es lo que garantiza la estabilidad del resultado.",
      },
      {
        q: "¿Me interesa clasificar tácticamente mis deseos?",
        a: "Si está del lado que propone — los candidatos, en Parcoursup — no: clasificar sinceramente es demostradamente óptimo. Poner primero un deseo que juzga « realista » en vez del que realmente quiere solo puede perjudicarle.",
      },
      {
        q: "¿Qué quiere decir « estable »?",
        a: "Que ninguna pareja candidato-formación se preferiría mutuamente a lo que obtuvo. Sin esa propiedad, se cerrarían acuerdos paralelos fuera del dispositivo: exactamente lo que ocurría en Estados Unidos antes de 1952.",
      },
      {
        q: "¿Qué diferencia hay con el turno de elección?",
        a: "El turno de elección solo hace clasificar a un lado: las opciones no opinan. Aquí ambos lados se clasifican y la asignación debe satisfacer a los dos, de ahí la noción de estabilidad, que no tiene sentido en un turno de elección.",
      },
    ],
  },
};

export default es;
