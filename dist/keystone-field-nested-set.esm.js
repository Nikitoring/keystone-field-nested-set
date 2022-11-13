import _objectDestructuringEmpty from '@babel/runtime/helpers/esm/objectDestructuringEmpty';
import _extends from '@babel/runtime/helpers/esm/extends';
import _objectSpread from '@babel/runtime/helpers/esm/objectSpread2';
import path from 'path';
import { fieldType, orderDirectionEnum } from '@keystone-6/core/types';
import { graphql } from '@keystone-6/core';

function listNameToPrismaModel(listKey) {
  return listKey[0].toLowerCase() + listKey.slice(1);
}
function isRoot(data) {
  return !!(data.left === 1);
}
function isAncestorOf(parenNode, current) {
  return parenNode.left > current.left && parenNode.right < current.right;
}
function isEqualTo(parenNode, current) {
  return Number(parenNode.left) === Number(current.left) && Number(parenNode.right) === Number(current.right);
}
async function getRoot(context, field, listType) {
  const roots = await context.prisma[listNameToPrismaModel(listType)].findMany({
    where: {
      [`${field}_depth`]: 0,
      [`${field}_left`]: 1
    },
    select: {
      id: true
    }
  });
  if (!roots) {
    return {};
  }
  return roots[0];
}
async function createRoot() {
  return {
    left: 1,
    right: 2,
    depth: 0
  };
}
function isLeaf(data) {
  return !!(data.right - data.left === 1);
}
async function getWeight(data) {
  return data.right - data.left;
}
async function getParentId(data, context, field, listType) {
  if (isRoot(data)) {
    return null;
  }
  const dbTable = listNameToPrismaModel(listType);
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
  if (parent.length) {
    return parent[0].id;
  }
  return '';
}
async function getchildrenCount(data, context, field, listType) {
  if (isLeaf(data)) {
    return 0;
  }
  const children = await context.prisma[listNameToPrismaModel(listType)].findMany({
    where: {
      [`${field}_left`]: {
        gt: data.left
      },
      [`${field}_right`]: {
        lt: data.right
      },
      [`${field}_depth`]: {
        gte: data.depth + 1
      }
    },
    select: {
      id: true
    }
  });
  return children.length;
}
async function getPrevSibling(prevSibling, context, listKey, fieldKey) {
  const currentNode = await context.prisma[listNameToPrismaModel(listKey)].findUnique({
    where: {
      id: prevSibling
    }
  });
  if (!currentNode) return false;
  return {
    right: currentNode[`${fieldKey}_left`] - 1
  };
}
async function getNextSibling(nextSibling, context, listKey, fieldKey) {
  const currentNode = await context.prisma[listNameToPrismaModel(listKey)].findUnique({
    where: {
      id: nextSibling
    }
  });
  if (!currentNode) return false;
  return {
    left: currentNode[`${fieldKey}_right`] + 1
  };
}
async function getChildOf(childOf, context, listKey, fieldKey) {
  const currentNode = await context.prisma[listNameToPrismaModel(listKey)].findUnique({
    where: {
      id: childOf
    }
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
async function getParentOf(parentId, context, listKey, fieldKey) {
  const currentNode = await context.prisma[listNameToPrismaModel(listKey)].findUnique({
    where: {
      id: parentId
    }
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
async function insertLastChildOf(parentId, context, listKey, fieldKey) {
  const bdTable = listNameToPrismaModel(listKey);
  const parentNode = await context.prisma[bdTable].findUnique({
    where: {
      id: parentId
    },
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
      transactions.push(context.prisma[bdTable].update({
        where: {
          id: node.id
        },
        data: {
          [`${fieldKey}_right`]: node[`${fieldKey}_right`] + 2,
          [`${fieldKey}_left`]: node[`${fieldKey}_left`] + 2
        }
      }));
    }
    if (node[`${fieldKey}_right`] >= parentNode[`${fieldKey}_right`] && node[`${fieldKey}_left`] < parentNode[`${fieldKey}_right`]) {
      transactions.push(context.prisma[bdTable].update({
        where: {
          id: node.id
        },
        data: {
          [`${fieldKey}_right`]: node[`${fieldKey}_right`] + 2
        }
      }));
    }
  }
  await context.prisma.$transaction(transactions);
  return {
    left: parentNode[`${fieldKey}_right`],
    right: parentNode[`${fieldKey}_right`] + 1,
    depth: parentNode[`${fieldKey}_depth`] + 1
  };
}
async function insertNextSiblingOf(nextSiblingId, context, listKey, fieldKey) {
  const bdTable = listNameToPrismaModel(listKey);
  const destNode = await context.prisma[bdTable].findUnique({
    where: {
      id: nextSiblingId
    },
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
  await shiftLeftRghtValues(newLeft, 2, {
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
async function insertPrevSiblingOf(nextSiblingId, context, listKey, fieldKey) {
  const bdTable = listNameToPrismaModel(listKey);
  const destNode = await context.prisma[bdTable].findUnique({
    where: {
      id: nextSiblingId
    },
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
  await shiftLeftRghtValues(newLeft, 2, {
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
async function fetchTree(parentNode, context, listKey, fieldKey) {
  const options = {
    where: {
      [`${fieldKey}_left`]: {
        gte: 1
      },
      [`${fieldKey}_depth`]: {
        lte: parentNode[`${fieldKey}_depth`] || 1
      }
    },
    orderBy: {
      [`${fieldKey}_left`]: 'asc'
    },
    select: {
      id: true,
      [`${fieldKey}_left`]: true,
      [`${fieldKey}_right`]: true,
      [`${fieldKey}_depth`]: true
    }
  };
  return await context.prisma[listNameToPrismaModel(listKey)].findMany(options);
}
async function moveNode(inputData, context, listKey, fieldKey, current) {
  if (!inputData[fieldKey]) return {};
  if (!Object.keys(current).length) return null;
  const {
    parentId,
    prevSiblingOf,
    nextSiblingOf
  } = inputData[fieldKey];
  if (parentId) {
    if (parentId === current.id) throw new Error(`You can't choose the same entity`);
    return await moveAsChildOf(parentId, current, {
      context,
      fieldKey,
      listKey
    });
  }
  if (prevSiblingOf) {
    if (prevSiblingOf === current.id) throw new Error(`You can't choose the same entity`);
    return await moveAsPrevSiblingOf(prevSiblingOf, current, {
      context,
      fieldKey,
      listKey
    });
  }
  if (nextSiblingOf) {
    if (nextSiblingOf === current.id) throw new Error(`You can't choose the same entity`);
    return await moveAsNextSiblingOf(nextSiblingOf, current, {
      context,
      fieldKey,
      listKey
    });
  }
}
async function moveAsChildOf(parentId, current, options) {
  if (!parentId) return {
    depth: null
  };
  const {
    context,
    fieldKey,
    listKey
  } = options;
  const parentNode = await context.prisma[listNameToPrismaModel(listKey)].findUnique({
    where: {
      id: parentId
    },
    select: {
      id: true,
      [`${fieldKey}_right`]: true,
      [`${fieldKey}_left`]: true,
      [`${fieldKey}_depth`]: true
    }
  });
  let prepareParentNode = {
    right: parentNode[`${fieldKey}_right`],
    left: parentNode[`${fieldKey}_left`],
    depth: parentNode[`${fieldKey}_depth`]
  };
  let currentNode = {
    right: current[`${fieldKey}_right`],
    left: current[`${fieldKey}_left`],
    depth: current[`${fieldKey}_depth`]
  };
  if (parentId === current.id || isAncestorOf(prepareParentNode, currentNode) || isEqualTo(prepareParentNode, currentNode)) {
    throw new Error('Cannot move node as first child of itself or into a descendant');
  }
  if (parentNode && parentNode.id) {
    const newDepth = parentNode[`${fieldKey}_depth`] + 1;
    await updateNode(parentNode[`${fieldKey}_right`], newDepth - current[`${fieldKey}_depth`], {
      context,
      fieldKey,
      listKey
    }, current);
    return {
      depth: newDepth
    };
  }
}
async function moveAsPrevSiblingOf(prevSiblingOfId, current, options) {
  const {
    context,
    fieldKey,
    listKey
  } = options;
  const prevSiblingNode = await context.prisma[listNameToPrismaModel(listKey)].findUnique({
    where: {
      id: prevSiblingOfId
    },
    select: {
      id: true,
      [`${fieldKey}_right`]: true,
      [`${fieldKey}_left`]: true,
      [`${fieldKey}_depth`]: true
    }
  });
  let parentNode = {
    right: prevSiblingNode[`${fieldKey}_right`],
    left: prevSiblingNode[`${fieldKey}_left`],
    depth: prevSiblingNode[`${fieldKey}_depth`]
  };
  let currentNode = {
    right: current[`${fieldKey}_right`],
    left: current[`${fieldKey}_left`],
    depth: current[`${fieldKey}_depth`]
  };
  if (prevSiblingOfId === current.id || isAncestorOf(parentNode, currentNode) || isEqualTo(parentNode, currentNode)) {
    throw new Error('Cannot move node as previous sibling of itself');
  }
  const newDepth = prevSiblingNode[`${fieldKey}_depth`];
  await updateNode(prevSiblingNode[`${fieldKey}_left`], newDepth - current[`${fieldKey}_depth`], {
    context,
    fieldKey,
    listKey
  }, current);
  return {
    depth: newDepth
  };
}
async function moveAsNextSiblingOf(nextSiblingId, current, options) {
  const {
    context,
    fieldKey,
    listKey
  } = options;
  const prevSiblingNode = await context.prisma[listNameToPrismaModel(listKey)].findUnique({
    where: {
      id: nextSiblingId
    },
    select: {
      id: true,
      [`${fieldKey}_right`]: true,
      [`${fieldKey}_left`]: true,
      [`${fieldKey}_depth`]: true
    }
  });
  let parentNode = {
    right: prevSiblingNode[`${fieldKey}_right`],
    left: prevSiblingNode[`${fieldKey}_left`],
    depth: prevSiblingNode[`${fieldKey}_depth`]
  };
  let currentNode = {
    right: current[`${fieldKey}_right`],
    left: current[`${fieldKey}_left`],
    depth: current[`${fieldKey}_depth`]
  };
  if (nextSiblingId === current.id || isAncestorOf(parentNode, currentNode) || isEqualTo(parentNode, currentNode)) {
    throw new Error('Cannot move node as next sibling of itself');
  }
  const newDepth = prevSiblingNode[`${fieldKey}_depth`];
  await updateNode(prevSiblingNode[`${fieldKey}_right`] + 1, newDepth - current[`${fieldKey}_depth`], {
    context,
    fieldKey,
    listKey
  }, current);
  return {
    depth: newDepth
  };
}
async function deleteResolver(current, options) {
  if (!current.id) return;
  const {
    context,
    listKey,
    fieldKey
  } = options;
  const bdTable = listNameToPrismaModel(listKey);
  const left = current[`${fieldKey}_left`];
  const right = current[`${fieldKey}_right`];
  const depth = current[`${fieldKey}_depth`];
  const parentId = await getParentId({
    left,
    right,
    depth
  }, context, fieldKey, listKey);
  const childrenTree = await context.prisma[bdTable].findMany({
    where: {
      AND: [{
        [`${fieldKey}_left`]: {
          gt: left
        }
      }, {
        [`${fieldKey}_left`]: {
          lt: right
        }
      }],
      [`${fieldKey}_depth`]: depth + 1
    },
    select: {
      id: true,
      [`${fieldKey}_right`]: true,
      [`${fieldKey}_left`]: true,
      [`${fieldKey}_depth`]: true
    }
  });
  if (childrenTree && childrenTree.length) {
    for (const child of childrenTree) {
      const move = await moveAsChildOf(parentId, child, options);
      if (move && move.depth !== null && move.depth !== undefined) {
        await context.prisma[bdTable].update({
          where: {
            id: child.id
          },
          data: {
            [`${fieldKey}_depth`]: move.depth
          }
        });
      }
    }
  }
  return;
}
async function shiftLeftRghtValues(first, increment, options) {
  const {
    context,
    bdTable,
    field
  } = options;
  const childrenTree = await context.prisma[bdTable].findMany({
    where: {
      [`${field}_left`]: {
        gte: first
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
  if (childrenTree && childrenTree.length) {
    for (const child of childrenTree) {
      transactions.push(context.prisma[bdTable].update({
        where: {
          id: child.id
        },
        data: {
          [`${field}_left`]: child[`${field}_left`] + increment
        }
      }));
    }
  }
  const parentTree = await context.prisma[bdTable].findMany({
    where: {
      [`${field}_right`]: {
        gte: first
      }
    },
    select: {
      id: true,
      [`${field}_left`]: true,
      [`${field}_right`]: true,
      [`${field}_depth`]: true
    }
  });
  if (parentTree && parentTree.length) {
    for (const child of parentTree) {
      transactions.push(context.prisma[bdTable].update({
        where: {
          id: child.id
        },
        data: {
          [`${field}_right`]: child[`${field}_right`] + increment
        }
      }));
    }
  }
  return await context.prisma.$transaction(transactions);
}
async function updateNode(destLeft, depthDiff, options, current) {
  const {
    context,
    fieldKey,
    listKey
  } = options;
  const bdTable = listNameToPrismaModel(listKey);
  let left = current[`${fieldKey}_left`];
  let right = current[`${fieldKey}_right`];
  const treeSize = right - left + 1;
  await shiftLeftRghtValues(destLeft, treeSize, {
    context,
    field: fieldKey,
    bdTable
  });
  if (left >= destLeft) {
    left += treeSize;
    right += treeSize;
  }
  const childrenTree = await context.prisma[bdTable].findMany({
    where: {
      [`${fieldKey}_left`]: {
        gt: left
      },
      [`${fieldKey}_right`]: {
        lt: right
      }
    },
    select: {
      id: true,
      [`${fieldKey}_left`]: true,
      [`${fieldKey}_right`]: true,
      [`${fieldKey}_depth`]: true
    }
  });
  const transactions = [];
  for (const child of childrenTree) {
    transactions.push(context.prisma[bdTable].update({
      where: {
        id: child.id
      },
      data: {
        [`${fieldKey}_depth`]: child[`${fieldKey}_depth`] + depthDiff
      }
    }));
  }
  await context.prisma.$transaction(transactions);
  await shiftLeftRightRange(left, right, destLeft - left, options);
  await shiftLeftRghtValues(right + 1, 0 - treeSize, {
    context,
    field: fieldKey,
    bdTable
  });
  return;
}
async function shiftLeftRightRange(first, last, increment, options) {
  const {
    context,
    fieldKey,
    listKey
  } = options;
  const bdTable = listNameToPrismaModel(listKey);
  const transactions = [];
  const leftTree = await context.prisma[bdTable].findMany({
    where: {
      AND: [{
        [`${fieldKey}_left`]: {
          gte: first
        }
      }, {
        [`${fieldKey}_left`]: {
          lte: last
        }
      }]
    },
    select: {
      id: true,
      [`${fieldKey}_left`]: true,
      [`${fieldKey}_right`]: true,
      [`${fieldKey}_depth`]: true
    }
  });
  for (const node of leftTree) {
    transactions.push(context.prisma[bdTable].update({
      where: {
        id: node.id
      },
      data: {
        [`${fieldKey}_left`]: node[`${fieldKey}_left`] + increment
      }
    }));
  }
  const rightTree = await context.prisma[bdTable].findMany({
    where: {
      AND: [{
        [`${fieldKey}_right`]: {
          gte: first
        }
      }, {
        [`${fieldKey}_right`]: {
          lte: last
        }
      }]
    },
    select: {
      id: true,
      [`${fieldKey}_left`]: true,
      [`${fieldKey}_right`]: true,
      [`${fieldKey}_depth`]: true
    }
  });
  for (const node of rightTree) {
    transactions.push(context.prisma[bdTable].update({
      where: {
        id: node.id
      },
      data: {
        [`${fieldKey}_right`]: node[`${fieldKey}_right`] + increment
      }
    }));
  }
  return await context.prisma.$transaction(transactions);
}
async function updateEntityIsNullFields(data, context, listKey, fieldKey) {
  const bdTable = listNameToPrismaModel(listKey);
  const root = await getRoot(context, fieldKey, listKey);
  if (!data && root && root.id) {
    const {
      left,
      right,
      depth
    } = await insertLastChildOf(root.id, context, listKey, fieldKey);
    return {
      left,
      right,
      depth
    };
  }
  if (!data && !root) {
    throw new Error('Please< create root before update this entity');
  }
  let entityId = '';
  let entityType = '';
  for (const [key, value] of Object.entries(data)) {
    if (value) {
      entityId = value;
      entityType = key;
    }
  }
  const entity = await context.prisma[bdTable].findUnique({
    where: {
      id: entityId
    },
    select: {
      id: true,
      [`${fieldKey}_right`]: true,
      [`${fieldKey}_left`]: true,
      [`${fieldKey}_depth`]: true
    }
  });
  const isEntityWithField = !!(entity[`${fieldKey}_right`] && entity[`${fieldKey}_left`]);
  if (!isEntityWithField && root) {
    const {
      left,
      right,
      depth
    } = await insertLastChildOf(root.id, context, listKey, fieldKey);
    return {
      left,
      right,
      depth
    };
  }
  switch (entityType) {
    case 'parentId':
      return await insertLastChildOf(entityId, context, listKey, fieldKey);
    case 'prevSiblingOf':
      return await insertPrevSiblingOf(entityId, context, listKey, fieldKey);
    case 'nextSiblingOf':
      return await insertNextSiblingOf(entityId, context, listKey, fieldKey);
  }
}
async function nodeIsInTree(data, options) {
  const {
    fieldKey,
    listKey,
    context
  } = options;
  const bdTable = listNameToPrismaModel(listKey);
  let entityId = '';
  for (const [key, value] of Object.entries(data)) {
    if (value) {
      entityId = value;
    }
  }
  const entity = await context.prisma[bdTable].findUnique({
    where: {
      id: entityId
    },
    select: {
      id: true,
      [`${fieldKey}_right`]: true,
      [`${fieldKey}_left`]: true,
      [`${fieldKey}_depth`]: true
    }
  });
  if (!entity[`${fieldKey}_left`]) {
    throw new Error(`Please add this entity ${entityId} in tree`);
  }
  return;
}

path.join(path.dirname(__dirname), 'views');
const nestedSetOutputFields = graphql.fields()({
  depth: graphql.field({
    type: graphql.Int
  }),
  left: graphql.field({
    type: graphql.Int
  }),
  right: graphql.field({
    type: graphql.Int
  }),
  weight: graphql.field({
    type: graphql.nonNull(graphql.Int),
    resolve(item, args, type, context) {
      return getWeight(_objectSpread({}, item));
    }
  }),
  isLeaf: graphql.field({
    type: graphql.nonNull(graphql.Boolean),
    resolve(item) {
      return isLeaf(_objectSpread({}, item));
    }
  }),
  parentId: graphql.field({
    type: graphql.ID,
    resolve(item, args, context, info) {
      const {
        key,
        typename
      } = info.path.prev;
      return getParentId(_objectSpread({}, item), context, key, typename);
    }
  }),
  childrenCount: graphql.field({
    type: graphql.nonNull(graphql.Int),
    resolve(item, args, context, info) {
      const {
        key,
        typename
      } = info.path.prev;
      return getchildrenCount(_objectSpread({}, item), context, key, typename);
    }
  })
});
const NestedSetOutput = graphql.interface()({
  name: 'NestedSetOutput',
  fields: nestedSetOutputFields,
  resolveType: () => 'NestedSetFieldOutput'
});
const NestedSetFieldOutput = graphql.object()({
  name: 'NestedSetFieldOutput',
  interfaces: [NestedSetOutput],
  fields: nestedSetOutputFields
});
const NestedSetFieldInput = graphql.inputObject({
  name: 'NestedSetFieldInput',
  fields: {
    parentId: graphql.arg({
      type: graphql.ID
    }),
    prevSiblingOf: graphql.arg({
      type: graphql.ID
    }),
    nextSiblingOf: graphql.arg({
      type: graphql.ID
    })
  }
});
const NestedSetFilterInput = graphql.inputObject({
  name: 'NestedSetFilterInput',
  fields: {
    prevSiblingId: graphql.arg({
      type: graphql.ID
    }),
    nextSiblingId: graphql.arg({
      type: graphql.ID
    }),
    parentOf: graphql.arg({
      type: graphql.ID
    }),
    childOf: graphql.arg({
      type: graphql.ID
    })
  }
});
async function inputResolver(data, context, listKey, fieldKey) {
  if (data === null || data === undefined) {
    const isRoot = await getRoot(context, fieldKey, listKey);
    if (isRoot) {
      return await insertLastChildOf(isRoot.id, context, listKey, fieldKey);
    }
    return createRoot();
  }
  const {
    parentId,
    prevSiblingOf,
    nextSiblingOf
  } = data;
  if (parentId) {
    return await insertLastChildOf(parentId, context, listKey, fieldKey);
  }
  if (nextSiblingOf) {
    return await insertNextSiblingOf(nextSiblingOf, context, listKey, fieldKey);
  }
  if (prevSiblingOf) {
    return await insertPrevSiblingOf(prevSiblingOf, context, listKey, fieldKey);
  }
  return data;
}
async function updateEntityIsNull(data, id, context, listKey, fieldKey) {
  return await updateEntityIsNullFields(data, id, context, listKey);
}
async function filterResolver(data, context, listKey, fieldKey) {
  const {
    prevSiblingId,
    nextSiblingId,
    childOf,
    parentOf
  } = data;
  let result = {};
  if (prevSiblingId) {
    const prevSiblingQuery = await getPrevSibling(prevSiblingId, context, listKey, fieldKey);
    result = _objectSpread(_objectSpread({}, result), prevSiblingQuery);
  }
  if (nextSiblingId) {
    const nextSiblingQuery = await getNextSibling(nextSiblingId, context, listKey, fieldKey);
    result = _objectSpread(_objectSpread({}, result), nextSiblingQuery);
  }
  if (childOf) {
    const childQuery = await getChildOf(childOf, context, listKey, fieldKey);
    result = _objectSpread(_objectSpread({}, result), childQuery);
  }
  if (parentOf) {
    const parentQuery = await getParentOf(parentOf, context, listKey, fieldKey);
    result = _objectSpread(_objectSpread({}, result), parentQuery);
  }
  return result;
}
const nestedSet = function () {
  let _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let config = _extends({}, (_objectDestructuringEmpty(_ref), _ref));
  return meta => {
    const listTypes = meta.lists[meta.listKey].types;
    const commonConfig = _objectSpread(_objectSpread({}, config), {}, {
      isIndexed: 'unique',
      getAdminMeta: () => {
        if (!listTypes) {
          throw new Error(`The ref [${listTypes}] on relationship [${meta.listKey}.${meta.fieldKey}] is invalid`);
        }
        return {
          listKey: meta.listKey,
          labelField: meta.fieldKey,
          displayMode: 'input'
        };
      }
    });
    return fieldType({
      kind: 'multi',
      fields: {
        left: {
          kind: 'scalar',
          scalar: 'Int',
          mode: 'optional'
        },
        right: {
          kind: 'scalar',
          scalar: 'Int',
          mode: 'optional'
        },
        depth: {
          kind: 'scalar',
          scalar: 'Int',
          mode: 'optional'
        }
      }
    })(_objectSpread(_objectSpread({}, commonConfig), {}, {
      hooks: {
        resolveInput: async _ref2 => {
          let {
            listKey,
            fieldKey,
            operation,
            inputData,
            item,
            resolvedData,
            context
          } = _ref2;
          if (operation === 'create') {
            if (inputData[fieldKey] && Object.keys(inputData[fieldKey]).length) {
              await nodeIsInTree(inputData[fieldKey], {
                context,
                listKey,
                fieldKey
              });
            }
          }
          if (operation === 'update') {
            let currentItem = {};
            if (item && item.id && item[`${fieldKey}_left`] !== null && item[`${fieldKey}_right`] !== null) {
              currentItem = {
                id: item.id,
                [`${fieldKey}_left`]: item[`${fieldKey}_left`],
                [`${fieldKey}_right`]: item[`${fieldKey}_right`],
                [`${fieldKey}_depth`]: item[`${fieldKey}_depth`]
              };
            }
            if (!Object.keys(currentItem).length) {
              return updateEntityIsNull(inputData[fieldKey], context, listKey, fieldKey);
            }
            return moveNode(inputData, context, listKey, fieldKey, currentItem);
          }
          return resolvedData[fieldKey];
        },
        validateDelete: async _ref3 => {
          let {
            listKey,
            fieldKey,
            item,
            context,
            operation
          } = _ref3;
          if (operation === 'delete') {
            let currentItem = {};
            if (!item.id) return;
            if (!item[`${fieldKey}_left`] || !item[`${fieldKey}_right`]) return;
            currentItem = {
              id: item.id,
              [`${fieldKey}_left`]: item[`${fieldKey}_left`],
              [`${fieldKey}_right`]: item[`${fieldKey}_right`],
              [`${fieldKey}_depth`]: item[`${fieldKey}_depth`]
            };
            return deleteResolver(currentItem, {
              context,
              listKey,
              fieldKey
            });
          }
          return;
        }
      },
      input: {
        where: {
          arg: graphql.arg({
            type: NestedSetFilterInput
          }),
          resolve(value, context) {
            return filterResolver(value, context, meta.listKey, meta.fieldKey);
          }
        },
        create: {
          arg: graphql.arg({
            type: NestedSetFieldInput
          }),
          async resolve(value, context) {
            return inputResolver(value, context, meta.listKey, meta.fieldKey);
          }
        },
        update: {
          arg: graphql.arg({
            type: NestedSetFieldInput
          }),
          async resolve(value, context, resolve) {
            return;
          }
        },
        orderBy: {
          arg: graphql.arg({
            type: orderDirectionEnum
          }),
          resolve: direction => {
            return {
              left: direction
            };
          }
        }
      },
      output: graphql.field({
        type: NestedSetFieldOutput,
        resolve(_ref4) {
          let {
            value
          } = _ref4;
          if (value.left === null || value.left === undefined || value.right === null || value.right === undefined || value.depth === null || value.depth === undefined) {
            return null;
          }
          return _objectSpread({}, value);
        }
      }),
      views: 'keystone-field-nested-set/views',
      unreferencedConcreteInterfaceImplementaetions: [NestedSetFieldOutput]
    }));
  };
};

export { nestedSet };
