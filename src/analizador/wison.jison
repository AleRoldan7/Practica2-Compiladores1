%lex
%options case-insensitive
%%

\s+                                         /* ignorar espacios */
"#".*                                       /* comentario línea */
[/][*][*]([^*]|[*]+[^*/])*[*]+[/]          /* comentario multilinea */

"[0-9]"               return 'RANGO_NUMERO';
"[a-z]"               return 'RANGO_LETRA_MINUSCULA';
"[A-Z]"               return 'RANGO_LETRA_MAYUSCULA';
"[aA-zZ]"             return 'RANGO_ABECEDARIO';

"Wison"               return 'WISON';
"Lex"                 return 'LEX';
"Terminal"            return 'TERMINAL';
"No_Terminal"         return 'NO_TERMINAL';
"Syntax"              return 'SYNTAX_PARSER';
"Initial_Sim"         return 'SIMBOLO_INICIAL';

"<="                  return 'FLECHA';
"<-"                  return 'ASIGNACION';

"{{:"                 return 'SYNTAX_BLOQUE_ABRE';
":}}"                 return 'SYNTAX_BLOQUE_CIERRA';
"{:"                  return 'BLOQUE_ABRE';
":}"                  return 'BLOQUE_CIERRA';

"("                   return 'PARENTESIS_ABRE';
")"                   return 'PARENTESIS_CIERRA';
"["                   return 'CORCHETE_ABRE';
"]"                   return 'CORCHETE_CIERRA';
";"                   return 'PUNTO_COMA';
"|"                   return 'OR';
"+"                   return 'MAS';
"*"                   return 'KLEENE';
"¿"                   return 'APERTURA';

"?Wison"              return 'CIERRE_WISON';
"?"                   return 'OPCIONAL';

[']([^'])*[']         return 'CADENA';

"$_"[a-zA-Z0-9_]+    return 'ID_TERMINAL';
"%_"[a-zA-Z0-9_]+    return 'ID_NO_TERMINAL';

<<EOF>>               return 'EOF';

. {
    yy.manejador.errorLexico(
        yytext,
        yylloc.first_line,
        yylloc.first_column + 1
    );
}

/lex


%start inicio
%%

inicio
    : WISON APERTURA bloque_lex bloque_syntax CIERRE_WISON EOF
    {
        $$ = {
            tipo: 'Wison',
            lex: $3,
            syntax: $4,
            linea: @1.first_line,
            columna: @1.first_column
        };
        return {
            ast: $$,
            tokens: yy.manejador.getToken(),
            errores: yy.manejador.getError()
        };
    }
    | error EOF
    {
        yy.manejador.errorEstructuraWison(
            yytext,
            @1.first_line,
            @1.first_column + 1
        );

        return {
            ast: null,
            tokens: yy.manejador.getToken(),
            errores: yy.manejador.getError()
        };
    }
    ;

/* ─────────────── BLOQUE LEX ─────────────── */

bloque_lex
    : LEX BLOQUE_ABRE lista_terminales BLOQUE_CIERRA
    {
        $$ = {
            tipo: 'BloqueLexico',
            terminales: $3,
            linea: @1.first_line,
            columna: @1.first_column
        };
    }
    | LEX BLOQUE_ABRE BLOQUE_CIERRA
    {
        $$ = {
            tipo: 'BloqueLexico',
            terminales: [],
            linea: @1.first_line,
            columna: @1.first_column
        };
    }
    | error BLOQUE_CIERRA
    {
        yy.manejador.errorBloqueLex(
            yytext,
            @1.first_line,
            @1.first_column + 1
        );
        $$ = { tipo: 'BloqueLexico', terminales: [], linea: @1.first_line, columna: @1.first_column };
    }
    ;

lista_terminales
    : lista_terminales declaracion_terminal
    {
        $$ = $1;
        $$.push($2);
    }
    | declaracion_terminal
    {
        $$ = [$1];
    }
    ;

declaracion_terminal
    : TERMINAL ID_TERMINAL ASIGNACION expresion_regular PUNTO_COMA
    {
        $$ = {
            tipo: 'DeclaracionTerminal',
            nombre: $2,
            expresion: $4,
            linea: @1.first_line,
            columna: @1.first_column
        };
        yy.manejador.agregarToken(
            $2,
            @2.first_line,
            @2.first_column + 1,
            "Expresión regular: " + yy.manejador.regexToString($4),
            "TERMINAL"
        );

    }
    | error PUNTO_COMA
    {
        yy.manejador.errorDeclaracionTerminal(
            yytext,
            @1.first_line,
            @1.first_column + 1
        );
        $$ = null;
    }
    ;

/* ─────────────── EXPRESIONES REGULARES ─────────────── */

expresion_regular
    : expresion_regular OR expresion_concatenada
    {
        $$ = { tipo: 'Union', izq: $1, der: $3, linea: @1.first_line, columna: @1.first_column };
    }
    | expresion_concatenada
    {
        $$ = $1;
    }
    ;

expresion_concatenada
    : expresion_concatenada expresion_unaria
    {
        $$ = { tipo: 'Concatenacion', izq: $1, der: $2, linea: @1.first_line, columna: @1.first_column };
    }
    | expresion_unaria
    {
        $$ = $1;
    }
    ;

expresion_unaria
    : expresion_primaria KLEENE
    {
        $$ = { tipo: 'Kleene', expr: $1, linea: @1.first_line, columna: @1.first_column };
    }
    | expresion_primaria MAS
    {
        $$ = { tipo: 'CerraduraPositiva', expr: $1, linea: @1.first_line, columna: @1.first_column };
    }
    | expresion_primaria OPCIONAL
    {
        $$ = { tipo: 'Opcional', expr: $1, linea: @1.first_line, columna: @1.first_column };
    }
    | expresion_primaria
    {
        $$ = $1;
    }
    ;

expresion_primaria
    : CADENA
    {
        $$ = { tipo: 'Caracter', valor: $1.slice(1,-1), linea: @1.first_line, columna: @1.first_column };
    }
    | RANGO_NUMERO
    {
        $$ = { tipo: 'Rango', valor: '[0-9]', linea: @1.first_line, columna: @1.first_column };
    }
    | RANGO_LETRA_MINUSCULA
    {
        $$ = { tipo: 'Rango', valor: '[a-z]', linea: @1.first_line, columna: @1.first_column };
    }
    | RANGO_LETRA_MAYUSCULA
    {
        $$ = { tipo: 'Rango', valor: '[A-Z]', linea: @1.first_line, columna: @1.first_column };
    }
    | RANGO_ABECEDARIO
    {
        $$ = { tipo: 'Rango', valor: '[aA-zZ]', linea: @1.first_line, columna: @1.first_column };
    }
    | ID_TERMINAL
    {
        $$ = { tipo: 'ReferenciaTerminal', nombre: $1, linea: @1.first_line, columna: @1.first_column };
    }
    | PARENTESIS_ABRE expresion_regular PARENTESIS_CIERRA
    {
        $$ = { tipo: 'Grupo', expr: $2, linea: @1.first_line, columna: @1.first_column };
    }
    | error
    {
       yy.manejador.errorExpresionRegular(
            yytext,
            @1.first_line,
            @1.first_column + 1
        );

        $$ = { tipo: 'Error', linea: @1.first_line, columna: @1.first_column };
    }
    ;

/* ─────────────── BLOQUE SYNTAX ─────────────── */

bloque_syntax
    : SYNTAX_PARSER SYNTAX_BLOQUE_ABRE lista_no_terminales simbolo_inicial lista_producciones SYNTAX_BLOQUE_CIERRA
    {
        $$ = {
            tipo: 'BloqueSintactico',
            noTerminales: $3,
            simboloInicial: $4,
            producciones: $5,
            linea: @1.first_line,
            columna: @1.first_column
        };
    }
    | SYNTAX_PARSER SYNTAX_BLOQUE_ABRE lista_no_terminales lista_producciones SYNTAX_BLOQUE_CIERRA
    {
        yy.manejador.errorSintactico(        
            '',
            @1.first_line,
            @1.first_column + 1,
            'Falta declarar el simbolo inicial: Initial_Sim %_Nombre ;'
        );
        $$ = {
            tipo: 'BloqueSintactico',
            noTerminales: $3,
            simboloInicial: null,
            producciones: $4,
            linea: @1.first_line,
            columna: @1.first_column
        };
    }
    | SYNTAX_PARSER SYNTAX_BLOQUE_ABRE SYNTAX_BLOQUE_CIERRA
    {
        $$ = {
            tipo: 'BloqueSintactico',
            noTerminales: [],
            simboloInicial: null,
            producciones: [],
            linea: @1.first_line,
            columna: @1.first_column
        };
    }
    | error SYNTAX_BLOQUE_CIERRA
    {
        yy.manejador.errorBloqueSyntax(
            yytext,
            @1.first_line,
            @1.first_column + 1
        );

        $$ = {
            tipo: 'BloqueSintactico',
            noTerminales: [],
            simboloInicial: null,
            producciones: [],
            linea: @1.first_line,
            columna: @1.first_column
        };
    }
    ;

lista_no_terminales
    : lista_no_terminales declaracion_no_terminal
    {
        $$ = $1;
        $$.push($2);
    }
    | declaracion_no_terminal
    {
        $$ = [$1];
    }
    ;

declaracion_no_terminal
    : NO_TERMINAL ID_NO_TERMINAL PUNTO_COMA
    {
        $$ = {
            tipo: 'DeclaracionNoTerminal',
            nombre: $2,
            linea: @1.first_line,
            columna: @1.first_column
        };
        yy.manejador.agregarToken(
            $2,
            @2.first_line,
            @2.first_column + 1,
            "No Terminal declarado",
            "NO_TERMINAL"
        );
        
    }
    ;

simbolo_inicial
    : SIMBOLO_INICIAL ID_NO_TERMINAL PUNTO_COMA
    {
        $$ = {
            tipo: 'SimboloInicial',
            nombre: $2,
            linea: @1.first_line,
            columna: @1.first_column
        };
        yy.manejador.agregarToken(
            $2,
            @2.first_line,
            @2.first_column + 1,
            "Simbolo de inicio",
            "SIMBOLO_INICIAL"
        );
    }
    ;



lista_producciones
    : lista_producciones produccion
    {
        $$ = $1;
        $$.push($2);
    }
    | produccion
    {
        $$ = [$1];
    }
    ;

produccion
    : ID_NO_TERMINAL FLECHA cuerpo_produccion PUNTO_COMA
    {

        let textoProduccion =
            $1 + " → " +
            yy.manejador.produccionToString($3);

        $$ = {
            tipo: 'Produccion',
            cabeza: $1,
            cuerpo: $3
        };

        yy.manejador.agregarToken(
            textoProduccion,
            @1.first_line,
            @1.first_column + 1,
            "Producción gramatical",
            "PRODUCCION"
        );

    }
    | error PUNTO_COMA
    {
        yy.manejador.errorProduccion(
            yytext,
            @1.first_line,
            @1.first_column + 1
        );

        $$ = null;
    }
    ;

cuerpo_produccion
    : cuerpo_produccion OR lista_simbolos
    {
        $$ = {
            tipo:'Alternativa',
            opciones:[
                ...($1.tipo==='Alternativa' ? $1.opciones : [$1]),
                $3
            ]
        };
    }
    | lista_simbolos
    {
        $$ = $1;
    }
    | /* ε */
    {
        $$ = {
            tipo:'Secuencia',
            simbolos:[],
            epsilon:true
        };
    }
    ;

lista_simbolos
    : lista_simbolos simbolo
    {
        $$ = { tipo: 'Secuencia', simbolos: [...($1.tipo === 'Secuencia' ? $1.simbolos : [$1]), $2] };
    }
    | simbolo
    {
        $$ = { tipo: 'Secuencia', simbolos: [$1] };
    }
    ;

simbolo
    : ID_TERMINAL
    {
        $$ = { tipo: 'SimboloTerminal', nombre: $1, linea: @1.first_line, columna: @1.first_column };
    }
    | ID_NO_TERMINAL
    {
        $$ = { tipo: 'SimboloNoTerminal', nombre: $1, linea: @1.first_line, columna: @1.first_column };
    }
    ;