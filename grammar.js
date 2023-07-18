module.exports = grammar({
  name: 'lura',

  extras: $ => [
    $.doc_string,
    $.line_comment,
    /[\s\r\n\uFEFF\u2060\u200B]/,
  ],

  conflicts: $ => [
    [$.path, $.primary],
    [$.app_expr, $.expr],
    [$.if_stmt, $.if_expr],
    [$.type_app_expr, $.app_expr],
    [$.expr, $.type_app_expr, $.app_expr],
  ],

  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => seq(
      optional($.hash_bang),
      optional(seq(
        $.decl,
        repeat(seq($._line_break, $.decl)),
        optional($._line_break)
      ))
    ),

    symbol_identifier: $ => seq('`', $.infix_op),

    identifier: $ => choice($.simple_identifier, $.symbol_identifier),

    path: $ => seq(
      field('segments', $.identifier),
      repeat(seq('.', field('segments', $.identifier))),
    ),
    // Declarations

    decl: $ => choice(
      $.command,
      $.using,
      $.class_decl,
      $.trait_decl,
      $.data_decl,
      $.signature,
      $.clause,
    ),

    _argument_list: $ => choice($.explicit_arguments, $.implicit_arguments),

    attribute: $ => prec.left(seq(
      '@',
      field('name', $.path),
      optional(seq(
        '(',
        $.expr,
        repeat(seq(',', field('argument', $.expr))),
        optional(','),
        ')',
      )),
    )),

    explicit_arguments: $ => seq('(', optional($._parameter_set), ')'),

    implicit_arguments: $ => seq('[', optional($._parameter_set), ']'),

    visibility: $ => choice('public', 'sealed', 'private', 'internal'),

    using: $ => seq(
      repeat(field('attribute', $.attribute)),
      'using',
      field('path', $.path),
    ),

    command: $ => seq(
      repeat(field('attribute', $.attribute)),
      '#',
      field('command', $.path),
      optional(seq(
        field('argument', $.expr),
        repeat(seq(',', field('argument', $.expr))),
        optional(','),
      )),
    ),

    signature: $ => seq(
      repeat(field('attribute', $.attribute)),
      optional(field('visibility', $.visibility)),
      field('name', $.path),
      repeat(field('argument', $._argument_list)),
      optional(field('clause_type', $._clause_type)),
      optional(field('value', $._signature_value)),
    ),

    clause: $ => seq(
      repeat(field('attribute', $.attribute)),
      field('name', $.path),
      repeat(field('pattern', $.pattern)),
      '=',
      optional(field('value', $.expr)),
    ),

    data_decl: $ => seq(
      repeat(field('attribute', $.attribute)),
      optional(field('visibility', $.visibility)),
      'data',
      field('name', $.path),
      repeat(field('argument', $._argument_list)),
      optional(field('clause_type', $._clause_type)),
      optional($._data_body),
    ),

    trait_decl: $ => seq(
      repeat(field('attribute', $.attribute)),
      optional(field('visibility', $.visibility)),
      'trait',
      field('name', $.path),
      repeat(field('argument', $._argument_list)),
      optional(field('clause_type', $._clause_type)),
      optional($._class_body),
    ),

    class_decl: $ => seq(
      repeat(field('attribute', $.attribute)),
      optional(field('visibility', $.visibility)),
      'class',
      field('name', $.path),
      repeat(field('argument', $._argument_list)),
      optional(field('clause_type', $._clause_type)),
      optional($._data_body),
    ),

    _class_body: $ => seq(
      '{',
      optional(seq(
        field('field', $._class_property),
        repeat(seq($._line_break, field('field', $._class_property))),
        optional($._line_break)
      )),
      '}'
    ),

    _signature_value: $ => prec(5, $.block),

    _class_property: $ => choice($.signature),

    _clause_type: $ => seq(':', field('clause_type', $.type_expr)),

    _data_body: $ => seq(
      '{',
      optional($._data_constructors),
      optional(seq(';', $._data_methods)),
      '}'
    ),

    _data_constructor: $ => seq(
      repeat(field('attribute', $.attribute)),
      choice(
        $.signature_constructor,
        $.function_constructor,
      ),
    ),

    _data_constructors: $ => seq(
      field('constructor', $._data_constructor),
      repeat(seq($._line_break, field('constructor', $._data_constructor))),
      optional($._line_break)
    ),

    _data_methods: $ => seq(
      field('field', $._class_property),
      repeat(seq($._line_break, field('field', $._class_property))),
      optional($._line_break)
    ),

    signature_constructor: $ => seq(
      field('name', $.path),
      ':',
      field('field_type', $.type_expr),
    ),

    function_constructor: $ => seq(
      field('name', $.path),
      repeat(field('parameter', $.constructor_parameter)),
    ),

    constructor_parameter: $ => prec.left(seq(
      prec(3, optional(seq(field('name', $.identifier), ':'))),
      field('parameter_type', $.expr),
    )),

    // Statements
    stmt: $ => choice(
      $.let_stmt,
      $.if_stmt,
      $.ask_stmt,
      $.expr_stmt,
    ),

    if_stmt: $ => seq(
      'if',
      field('condition', $.expr),
      field('then', $._then_body),
      optional(field('otherwise', $._else_body)),
    ),

    ask_stmt: $ => seq(
      field('pattern', $.pattern),
      '<-',
      field('value', $.expr),
    ),

    let_stmt: $ => seq(
      'let',
      field('pattern', $.pattern),
      '=',
      field('value', $.expr),
    ),

    expr_stmt: $ => $.expr,

    block: $ => seq(
      '{',
      optional(seq(
        field('statement', $.stmt),
        repeat(seq($._line_break, field('statement', $.stmt))),
        optional($._line_break)
      )),
      '}',
    ),

    // Patterns
    pattern: $ => choice($.cons_pattern, $.rest_pattern, $.literal),

    rest_pattern: $ => '..',

    cons_pattern: $ => prec.left(seq(
      field('name', $.path),
      repeat(field('pattern', $.pattern)),
    )),

    // Expressions
    expr: $ => choice(
      $.primary,
      $.match_expr,
      $.sigma_expr,
      $.app_expr,
      $.lam_expr,
      $.ann_expr,
      $.pi_expr,
      $.binary_expr,
    ),

    type_expr: $ => prec(2, choice(
      $.primary,
      $.match_expr,
      $.sigma_expr,
      $.type_app_expr,
      $.lam_expr,
      $.ann_expr,
      $.pi_expr,
      $.binary_expr,
    )),

    binary_expr: $ => prec.left(seq(
      field('lhs', $.expr),
      field('op', $.infix_op),
      field('rhs', $.expr),
    )),

    type_app_expr: $ => prec.left(seq(
      field('callee', $.primary),
      repeat(field('argument', $.primary)),
    )),

    app_expr: $ => prec.left(seq(
      field('callee', $.primary),
      repeat(field('argument', $.primary)),
      optional($.block),
    )),

    tuple_expr: $ => seq(
      '(',
      optional(seq(
        $.expr,
        repeat(seq(',', $.expr)),
        optional(','),
      )),
      ')',
    ),

    array_expr: $ => seq(
      '[',
      optional(seq(
        field('item', $.expr),
        repeat(seq(',', field('item', $.expr))),
        optional(','),
      )),
      ']'
    ),

    ann_expr: $ => prec.left(seq(
      field('value', $.expr),
      ':',
      field('against', $.expr),
    )),

    parameter: $ => prec.left(seq(
      field('pattern', $.pattern),
      optional(seq(
        ':',
        field('parameter_type', $.expr),
      )),
    )),

    _parameter_set: $ => seq(
      $.parameter,
      repeat(seq(',', $.parameter)),
      optional(','),
    ),

    lam_expr: $ => prec.left(1, seq(
      '|',
      optional($._parameter_set),
      '|',
      field('value', $.expr),
    )),

    pi_parameter: $ => choice(
      prec(1, $.primary),
      prec(3, seq(
        '(',
        optional($._parameter_set),
        ')',
      )),
    ),

    pi_expr: $ => prec.right(2, seq(
      field('parameter', $.pi_parameter),
      '->',
      field('value', $.type_expr),
    )),

    sigma_expr: $ => prec.left(3, seq(
      '[',
      optional($._parameter_set),
      ']',
      '->',
      field('value', $.type_expr),
    )),

    if_expr: $ => seq(
      'if',
      field('condition', $.expr),
      field('then', $._then_body),
      field('otherwise', $._else_body),
    ),

    match_expr: $ => seq(
      'match',
      field('scrutinee', $.expr),
      '{',
      repeat(field('arm', $.match_arm)),
      '}',
    ),

    return_expr: $ => prec.left(seq(
      'return',
      optional(field('value', $.expr)),
    )),

    match_arm: $ => seq(
      field('pattern', $.pattern),
      '=>',
      field('body', $._arm_body),
    ),

    _then_body: $ => prec.left(choice(
      $.block,
      seq('then', $.expr),
    )),

    _else_body: $ => prec.left(choice($.block, $.expr)),

    _arm_body: $ => choice($.block, $.expr),

    // Primaries
    primary: $ => prec(1, choice(
      $.literal,
      $.identifier,
      $.tuple_expr,
      $.array_expr,
      $.if_expr,
      $.match_expr,
      $.return_expr,
    )),

    literal: $ => choice(
      $.string,
      $.char,
      $.f32,
      $.f64,
      $.u1,
      $.i8,
      $.u8,
      $.i16,
      $.u16,
      $.u32,
      $.i64,
      $.u64,
      $.i128,
      $.u128,
      $.nat,
    ),

    _integer: $ => choice($._decimal, $.octal, $.hex, $.binary),

    f32: $ => prec(14, seq($._float, optional('f32'))),
    f64: $ => prec(13, seq($._float, optional('f64'))),
    i32: $ => prec(12, seq($._integer, optional('u32'))),
    u32: $ => prec(11, seq($._integer, optional('u32'))),
    u1: $ => prec(10, seq($._integer, optional('u1'))),
    i8: $ => prec(9, seq($._integer, optional('i8'))),
    u8: $ => prec(8, seq($._integer, optional('u8'))),
    i16: $ => prec(7, seq($._integer, optional('i16'))),
    u16: $ => prec(6, seq($._integer, optional('u16'))),
    i64: $ => prec(5, seq($._integer, optional('i64'))),
    u64: $ => prec(4, seq($._integer, optional('u64'))),
    i128: $ => prec(3, seq($._integer, optional('i128'))),
    u128: $ => prec(2, seq($._integer, optional('u128'))),
    nat: $ => prec(1, seq($._integer, optional('n'))),

    octal: $ => seq(choice('0O', '0o'), $._octal),
    hex: $ => seq(choice('0x', '0x'), $._hex),
    binary: $ => seq(choice('0B', '0b'), $._binary),

    // LEXER
    _line_break: $ => /(\n|\r\n|;)+/,

    _symbol: $ => choice('$', '?', '.', '+', '-', '*', '/', '%', '^', '&', '|', '&&', '||', '!', '~', '=', '<', '>'),

    _octal: $ => /[0-7]+/i,
    _hex: $ => /[0-8a-fA-F]+/i,
    _binary: $ => /[0-1]+/i,
    _decimal: $ => /[0-9]+/i,
    _float: $ => /\d+(\.[\d_]+)?/,

    char: $ => /'[^'\\]'/,
    string: $ => /"([^"\\\n\r]|\\[^\n\r])*"/,

    infix_op: $ => prec.left(repeat1($._symbol)),

    attribute_id: $ => /[a-zA-Z][a-zA-Z\d_$]*/,

    hash_bang: $ => /#!.*/,

    doc_string: $ => prec(2, token(seq('//!', /.*/))),
    line_comment: $ => prec(1, token(seq('//', /.*/))),

    simple_identifier: $ => /[a-zA-Z_'][a-zA-Z'\d_$]*/,
  }
});
