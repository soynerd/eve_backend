import prisma from '../config/prisma.js';
import { NotFoundError } from '../utils/errors.js';
import { tryGet, trySet, tryDelete, tryDeletePattern, KEYS, TTL } from './cache.service.js';
import { parsePagination, buildPaginationMeta } from '../utils/validation.js';

const listCentres = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const cacheKey = KEYS.centreList(page, limit);

  const cached = await tryGet(cacheKey);
  if (cached) return cached;

  const [centres, total] = await Promise.all([
    prisma.diagnosticCentre.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.diagnosticCentre.count(),
  ]);

  const result = { centres, meta: buildPaginationMeta(page, limit, total) };
  await trySet(cacheKey, result, TTL.centres);
  return result;
};

const getCentre = async (id) => {
  const cached = await tryGet(KEYS.centre(id));
  if (cached) return cached;

  const centre = await prisma.diagnosticCentre.findUnique({ where: { id } });
  if (!centre) throw new NotFoundError('Diagnostic centre not found');

  await trySet(KEYS.centre(id), centre, TTL.centres);
  return centre;
};

const createCentre = async (data) => {
  const centre = await prisma.diagnosticCentre.create({ data });
  // Invalidate all list caches when new centre is added
  await tryDeletePattern('centres:list:*');
  return centre;
};

const updateCentre = async (id, data) => {
  await getCentre(id); // ensure it exists first

  const centre = await prisma.diagnosticCentre.update({
    where: { id },
    data,
  });

  await tryDelete(KEYS.centre(id));
  await tryDeletePattern('centres:list:*');
  return centre;
};

const deleteCentre = async (id) => {
  await getCentre(id);

  await prisma.diagnosticCentre.delete({ where: { id } });
  await tryDelete(KEYS.centre(id), KEYS.centreTests(id));
  await tryDeletePattern('centres:list:*');
};

const getCentreTests = async (id, query) => {
  await getCentre(id);

  const { page, limit, skip } = parsePagination(query);
  const cacheKey = `${KEYS.centreTests(id)}:${page}:${limit}`;

  const cached = await tryGet(cacheKey);
  if (cached) return cached;

  const [rows, total] = await Promise.all([
    prisma.centreTest.findMany({
      where: { centreId: id },
      include: { test: true },
      skip,
      take: limit,
    }),
    prisma.centreTest.count({ where: { centreId: id } }),
  ]);

  const result = {
    tests: rows.map((r) => ({ ...r.test, centreTestId: r.id })),
    meta: buildPaginationMeta(page, limit, total),
  };

  await trySet(cacheKey, result, TTL.centres);
  return result;
};

export { listCentres, getCentre, createCentre, updateCentre, deleteCentre, getCentreTests };
