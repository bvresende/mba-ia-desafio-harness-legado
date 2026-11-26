/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'G4',
      severity: 'error',
      comment: 'Nada em api/src/http/ importa @prisma/client nem módulos de api/src/repositories/.',
      from: { path: '^api/src/http/' },
      to: {
        path: '(^api/src/repositories/|(^|/)node_modules/@prisma/client(/|$)|^@prisma/client(/|$))',
      },
    },
    {
      name: 'G6',
      severity: 'error',
      comment: 'Nada em api/src/services/ importa express, multer ou módulos de api/src/http/ (inclusive import type).',
      from: { path: '^api/src/services/' },
      to: {
        path: '(^api/src/http/|(^|/)node_modules/(@types/)?(express|multer)(/|$)|^(express|multer)(/|$))',
      },
    },
    {
      name: 'G7',
      severity: 'error',
      comment: 'O pacote openai só é importado em api/src/integrations/.',
      from: {
        path: '^(api/src|web/src)/',
        pathNot: '^api/src/integrations/',
      },
      to: {
        path: '((^|/)node_modules/(@types/)?openai(/|$)|^openai(/|$))',
      },
    },
    {
      name: 'G8',
      severity: 'error',
      comment: 'Nada em web/ importa arquivos de api/ (inclusive import type).',
      from: { path: '^web/' },
      to: { path: '^api/' },
    },
    {
      name: 'G9',
      severity: 'error',
      comment: 'Nenhum import circular em api/src/ nem em web/src/.',
      from: { path: '^(api/src|web/src)/' },
      to: { circular: true },
    },
    {
      name: 'G11',
      severity: 'error',
      comment: '@prisma/client só é importado em api/src/repositories/ (inclusive import type).',
      from: {
        path: '^api/src/',
        pathNot: '^api/src/repositories/',
      },
      to: {
        path: '((^|/)node_modules/@prisma/client(/|$)|^@prisma/client(/|$))',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'api/tsconfig.json',
    },
  },
}
