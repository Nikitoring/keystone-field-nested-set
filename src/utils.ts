import { KeystoneContext } from '@keystone-6/core/types';

export function isRoot(data: { [key: string]: any }) {
  return !!(data.left === 1);
}

export function createRoot() {
  return {
    left: 1,
    right: 2,
    depth: 0
  };
}

async function getRoot(context: KeystoneContext, field: string, listType: string) {
  const roots = await context.prisma[listType.toLowerCase()].findMany({
    where: {
      [`${field}_depth`]: 0,
      [`${field}_left`]: 1
    },
    select: {
      id: true,
      [`${field}_depth`]: true,
      [`${field}_left`]: true,
      [`${field}_right`]: true
    }
  });
  return roots[0];
}

export function isLeaf(data: { [key: string]: any }) {
  return (data.right = data.left === 1);
}

export async function getWeight(
  data: { [key: string]: any },
  context: KeystoneContext,
  field: string,
  listType: string
) {
  // SELECT * FROM tree WHERE right_key > $left_key AND left_key < $right_key ORDER BY left_key
  let depth = data.depth === 0 ? data.depth + 1 : data.depth;
  const branch = await context.prisma[listType.toLowerCase()].findMany({
    where: {
      [`${field}_depth`]: depth,
      [`${field}_left`]: {
        lt: data.right
      },
      [`${field}_right`]: {
        gt: data.left
      }
    }
  });
  return null;
}

export async function getParentId(
  data: { [key: string]: any },
  context: KeystoneContext,
  field: string,
  listType: string
) {
  if (isRoot(data)) {
    return null;
  }
  const dbTable = listType.toLowerCase();
  const parent = await context.prisma[dbTable].findMany({
    where: {
      [`${field}_depth`]: data.depth - 1,
      [`${field}_left`]: {
        lt: data.left
      },
      [`${field}_right`]: {
        gt: data.right
      }
    },
    select: {
      id: true
    }
  });
  return parent[0].id;
}

export async function getParent(
  data: { [key: string]: any },
  context: KeystoneContext,
  field: string,
  listType: string
) {
  if (isRoot(data)) {
    return null;
  }
  const dbTable = listType.toLowerCase();
  const parent = await context.prisma[dbTable].findMany({
    where: {
      [`${field}_depth`]: data[`${field}_depth`] - 1,
      [`${field}_left`]: {
        lt: data[`${field}_left`]
      },
      [`${field}_right`]: {
        gt: data[`${field}_right`]
      }
    },
    select: {
      id: true,
      [`${field}_depth`]: true,
      [`${field}_left`]: true,
      [`${field}_right`]: true
    }
  });
  return parent[0];
}

export async function getchildrenCount(
  data: { [key: string]: any },
  context: KeystoneContext,
  field: string,
  listType: string
) {
  if (isLeaf(data)) {
    return 0;
  }
  const children = await context.prisma[listType.toLowerCase()].findMany({
    where: {
      [`${field}_left`]: {
        gt: data.left
      },
      [`${field}_right`]: {
        lt: data.right
      }
    },
    select: {
      id: true
    }
  });
  return children.length;
}
export async function fetchRoot(rootId: string, context: KeystoneContext, listKey: string, fieldKey: string) {
  const root = await context.prisma[listKey.toLowerCase()].findUnique({ where: { id: rootId } });
  if (root[`${fieldKey}_left`] === 1) return root;
  return false;
}

export async function getPrevSibling(prevSibling: string, context: KeystoneContext, listKey: string, fieldKey: string) {
  const currentNode = await context.prisma[listKey.toLowerCase()].findUnique({
    where: { id: prevSibling }
  });
  if (!currentNode) return false;
  return {
    right: currentNode[`${fieldKey}_left`] - 1
  };
}

export async function getNextSibling(nextSibling: string, context: KeystoneContext, listKey: string, fieldKey: string) {
  const currentNode = await context.prisma[listKey.toLowerCase()].findUnique({
    where: { id: nextSibling }
  });
  if (!currentNode) return false;
  return {
    left: currentNode[`${fieldKey}_right`] + 1
  };
}

export async function getChildOf(childOf: string, context: KeystoneContext, listKey: string, fieldKey: string) {
  const currentNode = await context.prisma[listKey.toLowerCase()].findUnique({
    where: { id: childOf }
  });
  return {
    depth: currentNode[`${fieldKey}_depth`] - 1,
    left: {
      lt: currentNode[`${fieldKey}_left`]
    },
    right: {
      gt: currentNode[`${fieldKey}_right`]
    }
  };
}

export async function getParentOf(parentId: string, context: KeystoneContext, listKey: string, fieldKey: string) {
  const currentNode = await context.prisma[listKey.toLowerCase()].findUnique({
    where: { id: parentId }
  });
  return {
    depth: currentNode[`${fieldKey}_depth`] + 1,
    left: {
      gt: currentNode[`${fieldKey}_left`]
    },
    right: {
      lt: currentNode[`${fieldKey}_right`]
    }
  };
}

export async function insertLastChildOf(parentId: string, context: KeystoneContext, listKey: string, fieldKey: string) {
  const bdTable = listKey.toLowerCase();
  const parentNode = await context.prisma[bdTable].findUnique({
    where: { id: parentId },
    select: {
      id: true,
      [`${fieldKey}_right`]: true,
      [`${fieldKey}_left`]: true,
      [`${fieldKey}_depth`]: true
    }
  });
  if (!parentNode) return false;
  const tree = await fetchTree(parentNode, context, listKey, fieldKey);
  let transactions = [];
  for (const node of tree) {
    if (node[`${fieldKey}_left`] > parentNode[`${fieldKey}_right`]) {
      transactions.push(
        context.prisma[bdTable].update({
          where: {
            id: node.id
          },
          data: {
            [`${fieldKey}_right`]: node[`${fieldKey}_right`] + 2,
            [`${fieldKey}_left`]: node[`${fieldKey}_left`] + 2
          }
        })
      );
    }
    if (
      node[`${fieldKey}_right`] >= parentNode[`${fieldKey}_right`] &&
      node[`${fieldKey}_left`] < parentNode[`${fieldKey}_right`]
    ) {
      transactions.push(
        context.prisma[bdTable].update({
          where: {
            id: node.id
          },
          data: {
            [`${fieldKey}_right`]: node[`${fieldKey}_right`] + 2
          }
        })
      );
    }
  }
  await context.prisma.$transaction(transactions);
  return {
    left: parentNode[`${fieldKey}_right`],
    right: parentNode[`${fieldKey}_right`] + 1,
    depth: parentNode[`${fieldKey}_depth`] + 1
  };
}

export async function insertNextSiblingOf(
  nextSiblingId: string,
  context: KeystoneContext,
  listKey: string,
  fieldKey: string
) {
  const bdTable = listKey.toLowerCase();
  const destNode = await context.prisma[bdTable].findUnique({
    where: { id: nextSiblingId },
    select: {
      id: true,
      [`${fieldKey}_right`]: true,
      [`${fieldKey}_left`]: true,
      [`${fieldKey}_depth`]: true
    }
  });
  if (!destNode) return false;
  const newLeft = destNode[`${fieldKey}_right`] + 1;
  const newRight = destNode[`${fieldKey}_right`] + 2;
  const root = await getRoot(context, fieldKey, listKey);
  await shiftLeftRightValues(newLeft, 2, root, {
    context,
    field: fieldKey,
    bdTable
  });
  return {
    left: newLeft,
    right: newRight,
    depth: destNode[`${fieldKey}_depth`]
  };
}

export async function insertPrevSiblingOf(
  nextSiblingId: string,
  context: KeystoneContext,
  listKey: string,
  fieldKey: string
) {
  const bdTable = listKey.toLowerCase();
  const destNode = await context.prisma[bdTable].findUnique({
    where: { id: nextSiblingId },
    select: {
      id: true,
      [`${fieldKey}_right`]: true,
      [`${fieldKey}_left`]: true,
      [`${fieldKey}_depth`]: true
    }
  });
  if (!destNode) return false;
  const newLeft = destNode[`${fieldKey}_left`];
  const newRight = destNode[`${fieldKey}_left`] + 1;
  const root = await getRoot(context, fieldKey, listKey);
  await shiftLeftRightValues(newLeft, 2, root, {
    context,
    field: fieldKey,
    bdTable
  });
  return {
    left: newLeft,
    right: newRight,
    depth: destNode[`${fieldKey}_depth`]
  };
}

async function fetchTree(
  parentNode: { [key: string]: any },
  context: KeystoneContext,
  listKey: string,
  fieldKey: string
) {
  const options = {
    where: {
      [`${fieldKey}_left`]: {
        gte: 1
      },
      [`${fieldKey}_depth`]: {
        lte: parentNode[`${fieldKey}_depth`]
      }
    },
    orderBy: {
      [`${fieldKey}_left`]: 'asc'
    },
    select: {
      id: true,
      title: true,
      [`${fieldKey}_left`]: true,
      [`${fieldKey}_right`]: true,
      [`${fieldKey}_depth`]: true
    }
  };
  const tree = await context.prisma[listKey.toLowerCase()].findMany(options);
  return tree;
}

export async function moveAsChildOf(
  parentId: string,
  context: KeystoneContext,
  listKey: string,
  fieldKey: string,
  current: { [key: string]: any }
) {
  const bdTable = listKey.toLowerCase();
  const parentNode = await context.prisma[bdTable].findUnique({
    where: { id: parentId },
    select: {
      id: true,
      [`${fieldKey}_right`]: true,
      [`${fieldKey}_left`]: true,
      [`${fieldKey}_depth`]: true
    }
  });
}

async function shiftLeftRightValues(
  first: number,
  increment: number,
  root: { [key: string]: any },
  options: { [key: string]: any }
) {
  const { context, bdTable, field } = options;
  const leftTree = await context.prisma[bdTable].findMany({
    where: {
      [`${field}_left`]: {
        gte: first
      },
      [`${field}_right`]: {
        lte: root[`${field}_right`]
      }
    },
    select: {
      id: true,
      [`${field}_left`]: true,
      [`${field}_right`]: true,
      [`${field}_depth`]: true
    }
  });
  let transactions = [];
  for (const leftNode of leftTree) {
    transactions.push(
      context.prisma[bdTable].update({
        where: {
          id: leftNode.id
        },
        data: {
          [`${field}_left`]: leftNode[`${field}_left`] + increment
        }
      })
    );
  }
  const rightTree = await context.prisma[bdTable].findMany({
    where: {
      AND: [
        {
          [`${field}_right`]: {
            gte: first
          }
        },
        {
          [`${field}_right`]: {
            lte: root[`${field}_right`]
          }
        }
      ],
      [`${field}_left`]: {
        gte: root[`${field}_left`]
      }
    },
    select: {
      id: true,
      [`${field}_left`]: true,
      [`${field}_right`]: true,
      [`${field}_depth`]: true
    }
  });
  for (const rightNode of rightTree) {
    transactions.push(
      context.prisma[bdTable].update({
        where: {
          id: rightNode.id
        },
        data: {
          [`${field}_right`]: rightNode[`${field}_right`] + increment
        }
      })
    );
  }
  return await context.prisma.$transaction(transactions);
}
