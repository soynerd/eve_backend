import prisma from '../config/prisma.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { tryGet, trySet, tryDelete, tryDeletePattern, KEYS, TTL } from './cache.service.js';
import { parsePagination, buildPaginationMeta } from '../utils/validation.js';

const listTests = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const cacheKey = KEYS.testList(page, limit);

  const cached = await tryGet(cacheKey);
  if (cached) return cached;

  const [tests, total] = await Promise.all([
    prisma.diagnosticTest.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.diagnosticTest.count(),
  ]);

  const result = { tests, meta: buildPaginationMeta(page, limit, total) };
  await trySet(cacheKey, result, TTL.tests);
  return result;
};

const getTest = async (id) => {
  const cached = await tryGet(KEYS.test(id));
  if (cached) return cached;

  const test = await prisma.diagnosticTest.findUnique({ where: { id } });
  if (!test) throw new NotFoundError('Diagnostic test not found');

  await trySet(KEYS.test(id), test, TTL.tests);
  return test;
};

const createTest = async (data) => {
  const test = await prisma.diagnosticTest.create({ data });
  await tryDeletePattern('tests:list:*');
  return test;
};

const updateTest = async (id, data) => {
  await getTest(id);

  const test = await prisma.diagnosticTest.update({ where: { id }, data });
  await tryDelete(KEYS.test(id));
  await tryDeletePattern('tests:list:*');
  // Also bust cached centre-test lists that include this test
  await tryDeletePattern(`centre:*:tests*`);
  return test;
};

const deleteTest = async (id) => {
  await getTest(id);

  await prisma.diagnosticTest.delete({ where: { id } });
  await tryDelete(KEYS.test(id));
  await tryDeletePattern('tests:list:*');
  await tryDeletePattern('centre:*:tests*');
};

const addTestToCentre = async (testId, centreId) => {
  // Verify both exist
  const [test, centre] = await Promise.all([
    prisma.diagnosticTest.findUnique({ where: { id: testId } }),
    prisma.diagnosticCentre.findUnique({ where: { id: centreId } }),
  ]);

  if (!test) throw new NotFoundError('Diagnostic test not found');
  if (!centre) throw new NotFoundError('Diagnostic centre not found');

  const existing = await prisma.centreTest.findUnique({
    where: { centreId_testId: { centreId, testId } },
  });
  if (existing) throw new ConflictError('This test is already offered by this centre', 'ALREADY_LINKED');

  const centreTest = await prisma.centreTest.create({ data: { centreId, testId } });

  await tryDelete(KEYS.centreTests(centreId));
  await tryDeletePattern(`centre:${centreId}:tests*`);
  return centreTest;
};

const removeTestFromCentre = async (testId, centreId) => {
  const existing = await prisma.centreTest.findUnique({
    where: { centreId_testId: { centreId, testId } },
  });
  if (!existing) throw new NotFoundError('This test is not associated with this centre');

  await prisma.centreTest.delete({ where: { centreId_testId: { centreId, testId } } });
  await tryDeletePattern(`centre:${centreId}:tests*`);
};

const getTestCentres = async (testId, query) => {
  await getTest(testId);

  const { page, limit, skip } = parsePagination(query);
  const cacheKey = `${KEYS.testCentres(testId)}:${page}:${limit}`;

  const cached = await tryGet(cacheKey);
  if (cached) return cached;

  const [rows, total] = await Promise.all([
    prisma.centreTest.findMany({
      where: { testId },
      include: { centre: true },
      skip,
      take: limit,
    }),
    prisma.centreTest.count({ where: { testId } }),
  ]);

  const result = {
    centres: rows.map((r) => ({ ...r.centre, centreTestId: r.id })),
    meta: buildPaginationMeta(page, limit, total),
  };

  await trySet(cacheKey, result, TTL.tests);
  return result;
};

export {
  listTests,
  getTest,
  createTest,
  updateTest,
  deleteTest,
  addTestToCentre,
  removeTestFromCentre,
  getTestCentres,
};
