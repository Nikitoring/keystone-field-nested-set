import { KeystoneContext } from '@keystone-6/core/types';
import { updateRestTypeNode } from 'typescript';

export function isRoot(data: { [key: string]: any }) {
  return !!(data.left === 1);
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
      [`${field}_rght`]: true
    }
  });
  if (!roots) {
    return false;
  }
  return roots[0];
}

export async function createRoot() {
  return {
    left: 1,
    rght: 2,
    depth: 0
  };
}

export function isLeaf(data: { [key: string]: any }) {
  return (data.rght = data.left === 1);
}

export async function getWeight(data: { [key: string]: any }) {
  return data.rght - data.left;
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
      [`${field}_rght`]: {
        gt: data.rght
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
      [`${field}_rght`]: {
        gt: data[`${field}_rght`]
      }
    },
    select: {
      id: true,
      [`${field}_depth`]: true,
      [`${field}_left`]: true,
      [`${field}_rght`]: true
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
      [`${field}_rght`]: {
        lt: data.rght
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
    rght: currentNode[`${fieldKey}_left`] - 1
  };
}

export async function getNextSibling(nextSibling: string, context: KeystoneContext, listKey: string, fieldKey: string) {
  const currentNode = await context.prisma[listKey.toLowerCase()].findUnique({
    where: { id: nextSibling }
  });
  if (!currentNode) return false;
  return {
    left: currentNode[`${fieldKey}_rght`] + 1
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
    rght: {
      gt: currentNode[`${fieldKey}_rght`]
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
    rght: {
      lt: currentNode[`${fieldKey}_rght`]
    }
  };
}

export async function insertLastChildOf(parentId: string, context: KeystoneContext, listKey: string, fieldKey: string) {
  const bdTable = listKey.toLowerCase();
  const parentNode = await context.prisma[bdTable].findUnique({
    where: { id: parentId },
    select: {
      id: true,
      [`${fieldKey}_rght`]: true,
      [`${fieldKey}_left`]: true,
      [`${fieldKey}_depth`]: true
    }
  });
  if (!parentNode) return false;
  const tree = await fetchTree(parentNode, context, listKey, fieldKey);
  let transactions = [];
  for (const node of tree) {
    if (node[`${fieldKey}_left`] > parentNode[`${fieldKey}_rght`]) {
      transactions.push(
        context.prisma[bdTable].update({
          where: {
            id: node.id
          },
          data: {
            [`${fieldKey}_rght`]: node[`${fieldKey}_rght`] + 2,
            [`${fieldKey}_left`]: node[`${fieldKey}_left`] + 2
          }
        })
      );
    }
    if (
      node[`${fieldKey}_rght`] >= parentNode[`${fieldKey}_rght`] &&
      node[`${fieldKey}_left`] < parentNode[`${fieldKey}_rght`]
    ) {
      transactions.push(
        context.prisma[bdTable].update({
          where: {
            id: node.id
          },
          data: {
            [`${fieldKey}_rght`]: node[`${fieldKey}_rght`] + 2
          }
        })
      );
    }
  }
  await context.prisma.$transaction(transactions);
  return {
    // left: parentNode[`${fieldKey}_rght`],
    // rght: parentNode[`${fieldKey}_rght`] + 1,
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
      [`${fieldKey}_rght`]: true,
      [`${fieldKey}_left`]: true,
      [`${fieldKey}_depth`]: true
    }
  });
  if (!destNode) return false;
  const newLeft = destNode[`${fieldKey}_rght`] + 1;
  const newRght = destNode[`${fieldKey}_rght`] + 2;
  const root = await getRoot(context, fieldKey, listKey);
  await shiftLeftRghtValues(newLeft, 2, root, {
    context,
    field: fieldKey,
    bdTable
  });
  return {
    left: newLeft,
    rght: newRght,
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
      [`${fieldKey}_rght`]: true,
      [`${fieldKey}_left`]: true,
      [`${fieldKey}_depth`]: true
    }
  });
  if (!destNode) return false;
  const newLeft = destNode[`${fieldKey}_left`];
  const newRght = destNode[`${fieldKey}_left`] + 1;
  const root = await getRoot(context, fieldKey, listKey);
  await shiftLeftRghtValues(newLeft, 2, root, {
    context,
    field: fieldKey,
    bdTable
  });
  return {
    left: newLeft,
    rght: newRght,
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
      [`${fieldKey}_left`]: true,
      [`${fieldKey}_rght`]: true,
      [`${fieldKey}_depth`]: true
    }
  };
  return await context.prisma[listKey.toLowerCase()].findMany(options);
}

export async function moveNode(
  inputData: { [key: string]: any },
  context: KeystoneContext,
  listKey: string,
  fieldKey: string,
  current: { [key: string]: any }
) {
  const { parentId, prevSiblingOf, nextSiblingOf } = inputData[fieldKey];
  if (parentId) {
    return await moveAsChildOf(parentId, current, { context, fieldKey, listKey })
  }
  if (prevSiblingOf) {
    return await moveAsPrevSiblingOf(prevSiblingOf, current, { context, fieldKey, listKey })
  }
  if (nextSiblingOf) {
    return await moveAsNextSiblingOf(nextSiblingOf, current, { context, fieldKey, listKey })
  }
}

async function moveAsChildOf(parentId:string, current: { [key: string]: any }, options: { [key: string]: any }) {
  const { context, fieldKey, listKey } = options
  const parentNode = await context.prisma[listKey.toLowerCase()].findUnique({
    where: { id: parentId },
    select: {
      id: true,
      [`${fieldKey}_rght`]: true,
      [`${fieldKey}_left`]: true,
      [`${fieldKey}_depth`]: true
    }
  });
  if (parentNode) {
    const newDepth = parentNode[`${fieldKey}_depth`] + 1;
    await updateNode(
      parentNode[`${fieldKey}_rght`],
      newDepth - current[`${fieldKey}_depth`],
      { context, fieldKey, listKey },
      current
    );
    return {
      depth: newDepth
    };
  }
}

async function moveAsPrevSiblingOf(prevSiblingOfId:string, current: { [key: string]: any }, options: { [key: string]: any }) {
  const { context, fieldKey, listKey } = options
  const prevSiblingNode = await context.prisma[listKey.toLowerCase()].findUnique({
    where: { id: prevSiblingOfId },
    select: {
      id: true,
      [`${fieldKey}_rght`]: true,
      [`${fieldKey}_left`]: true,
      [`${fieldKey}_depth`]: true
    }
  });
  const newDepth = prevSiblingNode[`${fieldKey}_depth`]
  await updateNode(
    prevSiblingNode[`${fieldKey}_left`],
    newDepth - current[`${fieldKey}_depth`],
    { context, fieldKey, listKey },
    current
  );
  return {
    depth: newDepth
  }

}
async function moveAsNextSiblingOf(nextSiblingId:string, current: { [key: string]: any }, options: { [key: string]: any }) {
  const { context, fieldKey, listKey } = options
  const prevSiblingNode = await context.prisma[listKey.toLowerCase()].findUnique({
    where: { id: nextSiblingId },
    select: {
      id: true,
      [`${fieldKey}_rght`]: true,
      [`${fieldKey}_left`]: true,
      [`${fieldKey}_depth`]: true
    }
  });
  const newDepth = prevSiblingNode[`${fieldKey}_depth`]
  await updateNode(
    prevSiblingNode[`${fieldKey}_rght`] +1,
    newDepth - current[`${fieldKey}_depth`],
    { context, fieldKey, listKey },
    current
  );
  return {
    depth: newDepth
  }

}
export async function deleteResolver(
  inputData: string,
  context: KeystoneContext,
  listKey: string,
  fieldKey: string,
  current: { [key: string]: any }
) {
  const bdTable = listKey.toLowerCase();
  const dataToParentId = {
    left: current[`${fieldKey}_left`],
    rght: current[`${fieldKey}_rght`],
    depth: current[`${fieldKey}_depth`]
  };
  const parentId = await getParentId(dataToParentId, context, fieldKey, listKey);
  const childrenTree = await context.prisma[bdTable].findMany({
    where: {
      left: {
        gte: current[`${fieldKey}_left`]
      },
      rght: {
        lte: current[`${fieldKey}_rght`]
      }
    }
  });
  if (childrenTree.length && parentId) {
    for (const child of childrenTree) {
    }
  }
}

async function shiftLeftRghtValues(
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
      }
    },
    select: {
      id: true,
      [`${field}_left`]: true,
      [`${field}_rght`]: true,
      [`${field}_depth`]: true
    }
  });
  let transactions = [];
  if (leftTree.length) {
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
  }

  const rghtTree = await context.prisma[bdTable].findMany({
    where: {
      [`${field}_rght`]: {
        gte: first
      }
    },
    select: {
      id: true,
      [`${field}_left`]: true,
      [`${field}_rght`]: true,
      [`${field}_depth`]: true
    }
  });
  if (rghtTree.length) {
    for (const rghtNode of rghtTree) {
      transactions.push(
        context.prisma[bdTable].update({
          where: {
            id: rghtNode.id
          },
          data: {
            [`${field}_rght`]: rghtNode[`${field}_rght`] + increment
          }
        })
      );
    }
  }
  
  return await context.prisma.$transaction(transactions);
}

async function updateNode(
  destLeft: number,
  depthDiff: number,
  options: { [key: string]: any },
  current: { [key: string]: any }
) {
  const { context, fieldKey, listKey } = options;
  const bdTable = listKey.toLowerCase();
  const root = await getRoot(context, fieldKey, listKey);
  let left = current[`${fieldKey}_left`];
  let right = current[`${fieldKey}_rght`];
  const treeSize = right - left + 1;
  await shiftLeftRghtValues(destLeft, treeSize, root, {
    context,
    field: fieldKey,
    bdTable
  });
  if (left >= destLeft) {
    left += treeSize;
    right += treeSize;
  }
  await context.prisma[bdTable].updateMany({
    where: {
      [`${fieldKey}_left`]: {
        gt: left
      },
      [`${fieldKey}_rght`]: {
        lt: right
      }
    },
    data: {
      [`${fieldKey}_depth`]: depthDiff
    }
  });
  await shiftLeftRightRange(left, right, destLeft - left, root, options);
  await shiftLeftRghtValues(right + 1, 0 - treeSize, root, {
    context,
    field: fieldKey,
    bdTable
  });
  return;
}

async function shiftLeftRightRange(
  first: number,
  last: number,
  delta: number,
  root: { [key: string]: any },
  options: { [key: string]: any }
) {
  const { context, fieldKey, listKey } = options;
  const bdTable = listKey.toLowerCase();
  const transactions = [];
  const leftTree = await context.prisma[bdTable].findMany({
    where: {
      AND: [
        {
          [`${fieldKey}_left`]: {
            gte: first
          }
        },
        {
          [`${fieldKey}_left`]: {
            lte: last
          }
        }
      ]
    },
    select: {
      id: true,
      [`${fieldKey}_left`]: true,
      [`${fieldKey}_rght`]: true,
      [`${fieldKey}_depth`]: true
    }
  });
  for (const node of leftTree) {
    transactions.push(
      context.prisma[bdTable].update({
        where: {
          id: node.id
        },
        data: {
          [`${fieldKey}_left`]: node[`${fieldKey}_left`] + delta
        }
      })
    );
  }
  const rightTree = await context.prisma[bdTable].findMany({
    where: {
      AND: [
        {
          [`${fieldKey}_rght`]: {
            gte: first
          }
        },
        {
          [`${fieldKey}_rght`]: {
            lte: last
          }
        }
      ]
    },
    select: {
      id: true,
      [`${fieldKey}_left`]: true,
      [`${fieldKey}_rght`]: true,
      [`${fieldKey}_depth`]: true
    }
  });
  for (const node of rightTree) {
    transactions.push(
      context.prisma[bdTable].update({
        where: {
          id: node.id
        },
        data: {
          [`${fieldKey}_rght`]: node[`${fieldKey}_rght`] + delta
        }
      })
    );
  }
  await context.prisma.$transaction(transactions);
  return;
}
