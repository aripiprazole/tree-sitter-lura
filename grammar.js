module.exports = grammar({
  name: 'asena',

  extras: $ => [
    $.doc_string,
    $.line_comment,
    /[\s\r\n\uFEFF\u2060\u200B]/,
  ],

  conflicts: $ => [
    [$.path, $._primary],
    [$.app_expr, $._expr],
    [$.parameter, $._primary],
    [$.if_stmt, $.if_expr],
  ],

  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => $.block,

    identifier: $ => /[a-zA-Z_'][a-zA-Z'\d_$]*/,

    path: $ => seq(
      field('segments', $.identifier),
      repeat(seq('.', field('segments', $.identifier))),
    ),

    // Statements
    _stmt: $ => choice(
      $.let_stmt,
      $.if_stmt,
      $.ask_stmt,
      $.expr_stmt,
    ),

    if_stmt: $ => seq(
      'if',
      field('condition', $._expr),
      field('then', $._then_body),
      optional(field('otherwise', $._else_body)),
    ),

    ask_stmt: $ => seq(
      field('pattern', $._pattern),
      '<-',
      field('value', $._expr),
    ),

    let_stmt: $ => seq(
      'let',
      field('pattern', $._pattern),
      '=',
      field('value', $._expr),
    ),

    expr_stmt: $ => $._expr,

    block: $ => seq(
      '{',
      optional(seq(
        $._stmt,
        repeat(seq($._line_break, $._stmt)),
        optional($._line_break)
      )),
      '}',
    ),

    // Patterns
    _pattern: $ => choice($.cons_pattern, $.rest_pattern, $._literal),

    rest_pattern: $ => '..',

    cons_pattern: $ => prec.left(seq(
      field('name', $.path),
      repeat(field('patterns', $._pattern)),
    )),

    // Expressions
    _expr: $ => choice(
      $.match_expr,
      $.sigma_expr,
      $.app_expr,
      $._primary,
      $.ann_expr,
      $.pi_expr,
      $.binary_expr,
    ),

    binary_expr: $ => prec.left(seq(
      field('lhs', $._expr),
      $.infix_op,
      field('rhs', $._expr),
    )),

    app_expr: $ => prec.left(seq(
      field('callee', $._primary),
      repeat1(field('arguments', $._primary)),
    )),

    tuple_expr: $ => seq(
      '(',
      repeat(seq($._expr, ',')),
      optional(','),
      ')',
    ),

    array_expr: $ => seq(
      '[',
      repeat(seq($._expr, ',')),
      optional(','),
      ']'
    ),

    ann_expr: $ => prec.left(seq(
      field('value', $._expr),
      ':',
      field('type', $._expr),
    )),

    parameter: $ => seq(
      field('name', $.identifier),
      optional(seq(
        ':',
        field('type', $._expr),
      )),
    ),

    _parameter_set: $ => seq(
      repeat1(seq($.parameter, ',')),
      optional(','),
    ),

    lam_expr: $ => prec.right(seq(
      '|',
      optional($._parameter_set),
      '|',
      field('value', $._expr),
    )),

    pi_expr: $ => prec.right(seq(
      '(',
      optional($._parameter_set),
      ')',
      '->',
      field('value', $._expr),
    )),

    sigma_expr: $ => prec.right(seq(
      '[',
      optional($._parameter_set),
      ']',
      '->',
      field('value', $._expr),
    )),

    if_expr: $ => seq(
      'if',
      field('condition', $._expr),
      field('then', $._then_body),
      field('otherwise', $._else_body),
    ),

    match_expr: $ => seq(
      'match',
      field('scrutinee', $._expr),
      '{',
      repeat($.match_arm),
      '}',
    ),

    return_expr: $ => prec.left(seq(
      'return',
      field('value', $._expr),
    )),

    match_arm: $ => seq(
      field('pattern', $._pattern),
      '=>',
      field('body', $._arm_body),
    ),

    _then_body: $ => choice(
      $.block,
      seq('then', $._expr),
    ),

    _else_body: $ => prec.left(choice($.block, $._expr)),

    _arm_body: $ => choice($.block, $._expr),

    // Primaries
    _primary: $ => prec(1, choice(
      $._literal,
      $.identifier,
      $.tuple_expr,
      $.array_expr,
      $.if_expr,
      $.match_expr,
      $.return_expr,
    )),

    _literal: $ => choice(
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

    infix_op: $ => repeat1($._symbol),

    attribute_id: $ => /[a-zA-Z][a-zA-Z\d_$]*/,

    hash_bang: $ => /#!.*/,

    doc_string: $ => prec(2, token(seq('//!', /.*/))),
    line_comment: $ => prec(1, token(seq('//', /.*/))),
  }
});
