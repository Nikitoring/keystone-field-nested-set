// ! Field Right in data return Boolean in virtual fields (if Field Right like "rght" this work)
import {
  BaseListTypeInfo,
  FieldTypeFunc,
  CommonFieldConfig,
  fieldType,
  AdminMetaRootVal,
  KeystoneContext,
  orderDirectionEnum
} from '@keystone-6/core/types';
import { graphql } from '@keystone-6/core';
import {
  createRoot,
  isLeaf,
  getWeight,
  getParentId,
  getchildrenCount,
  getPrevSibling,
  getNextSibling,
  getChildOf,
  getParentOf,
  insertLastChildOf,
  insertNextSiblingOf,
  insertPrevSiblingOf,
  moveNode,
  deleteResolver
} from './utils';

// const views = path.join(path.dirname(__dirname), 'views');
const views = require.resolve('./views');
// console.log('views', views);

type SelectDisplayConfig = {
  ui?: {
    // Sets the relationship to display as a Select field
    displayMode?: 'select';
    /**
     * The path of the field to use from the related list for item labels in the select.
     * Defaults to the labelField configured on the related list.
     */
    labelField?: string;
  };
};

export type NestedSetData = {
  depth: number;
  left: number;
  rght: number;
};

const nestedSetOutputFields = graphql.fields<NestedSetData>()({
  depth: graphql.field({ type: graphql.Int }),
  left: graphql.field({ type: graphql.nonNull(graphql.Int) }),
  rght: graphql.field({ type: graphql.nonNull(graphql.Int) }),
  weight: graphql.field({
    type: graphql.Int,
    resolve(data, args, type, context) {
      return getWeight(data, type, context.path.prev?.key, context.path.prev?.typename);
    }
  }),
  isLeaf: graphql.field({
    type: graphql.nonNull(graphql.Boolean),
    resolve(data) {
      return isLeaf(data);
    }
  }),
  parentId: graphql.field({
    type: graphql.ID,
    resolve(data, args, type, context) {
      return getParentId(data, type, context.path.prev?.key, context.path.prev?.typename);
    }
  }),
  childrenCount: graphql.field({
    type: graphql.Int,
    resolve(data, args, context, type) {
      return getchildrenCount(data, context, type.path.prev?.key, type.path.prev?.typename);
    }
  })
});

const NestedSetOutput = graphql.interface<NestedSetData>()({
  name: 'NestedSetOutput',
  fields: nestedSetOutputFields,
  resolveType: () => {
    return 'NestedSetFieldOutput';
  }
});

const NestedSetFieldOutput = graphql.object<NestedSetData>()({
  name: 'NestedSetFieldOutput',
  interfaces: [NestedSetOutput],
  fields: nestedSetOutputFields
});

const NestedSetFieldInput = graphql.inputObject({
  name: 'NestedSetFieldInput',
  fields: {
    parentId: graphql.arg({ type: graphql.ID }),
    prevSiblingOf: graphql.arg({ type: graphql.ID }),
    nextSiblingOf: graphql.arg({ type: graphql.ID })
  }
});

const NestedSetFilterInput = graphql.inputObject({
  name: 'NestedSetFilterInput',
  fields: {
    prevSiblingId: graphql.arg({ type: graphql.ID }),
    nextSiblingId: graphql.arg({ type: graphql.ID }),
    parentOf: graphql.arg({ type: graphql.ID }),
    childOf: graphql.arg({ type: graphql.ID })
  }
});

type NestedSetFieldInputType = undefined | null | { parentId?: string; prevSiblingOf?: string; nextSiblingOf?: string };

type NestedSetFieldFilterType =
  | undefined
  | null
  | { parentId?: string; prevSiblingId?: string; nextSiblingId?: string; childOf?: string };

async function inputResolver(
  data: NestedSetFieldInputType,
  context: KeystoneContext,
  listKey: string,
  fieldKey: string
) {
  if (data === null || data === undefined) {
    return createRoot();
  }
  const { parentId, prevSiblingOf, nextSiblingOf } = data;
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

async function updateInputResolver(
  data: NestedSetFieldInputType,
  context: KeystoneContext,
  list: string,
  field: string
) {
  // return;
  const { parentId, prevSiblingOf, nextSiblingOf } = data;
  const bdTable = list.toLowerCase();
  if (parentId) {
    const parent = await context.prisma[bdTable].findUnique({
      where: { id: parentId },
      select: {
        id: true,
        [`${field}_rght`]: true,
        [`${field}_left`]: true,
        [`${field}_depth`]: true
      }
    });
    return {
      left: parent[`${field}_rght`],
      rght: parent[`${field}_rght`] + 2,
      depth: parent[`${field}_depth`] + 1
    };
  }
  // if (parentId) {
  //   return await moveAsChildOf(parentId, context, listKey, fieldKey, current);
  // }
  // if (nextSiblingOf) {
  //   return await insertNextSiblingOf(nextSiblingOf, context, listKey, fieldKey);
  // }
  // if (prevSiblingOf) {
  //   return await insertPrevSiblingOf(prevSiblingOf, context, listKey, fieldKey);
  // }
  // return data;
}

async function filterResolver(
  data: NestedSetFieldFilterType,
  context: KeystoneContext,
  listKey: string,
  fieldKey: string
) {
  const { prevSiblingId, nextSiblingId, childOf, parentOf } = data;
  let result = {};
  if (prevSiblingId) {
    const prevSiblingQuery = await getPrevSibling(prevSiblingId, context, listKey, fieldKey);
    result = { ...result, ...prevSiblingQuery };
  }
  if (nextSiblingId) {
    const nextSiblingQuery = await getNextSibling(nextSiblingId, context, listKey, fieldKey);
    result = { ...result, ...nextSiblingQuery };
  }
  if (childOf) {
    const childQuery = await getChildOf(childOf, context, listKey, fieldKey);
    result = { ...result, ...childQuery };
  }
  if (parentOf) {
    const parentQuery = await getParentOf(parentOf, context, listKey, fieldKey);
    result = { ...result, ...parentQuery };
  }
  return result;
}

export type NestedSetConfig<ListTypeInfo extends BaseListTypeInfo> =
  CommonFieldConfig<ListTypeInfo> & {} & SelectDisplayConfig;

export const nestedSet =
  <ListTypeInfo extends BaseListTypeInfo>({
    ...config
  }: NestedSetConfig<ListTypeInfo> = {}): FieldTypeFunc<ListTypeInfo> =>
  (meta) => {
    const listTypes = meta.lists[meta.listKey].types;
    const commonConfig = {
      ...config,
      isIndexed: 'unique',
      getAdminMeta: (
        adminMetaRoot: AdminMetaRootVal
      ): Parameters<typeof import('./views').controller>[0]['fieldMeta'] => {
        if (!listTypes) {
          throw new Error(`The ref [${listTypes}] on relationship [${meta.listKey}.${meta.fieldKey}] is invalid`);
        }
        return {
          listKey: meta.listKey,
          labelField: adminMetaRoot.listsByKey[meta.listKey].labelField
        };
      }
    };
    return fieldType({
      kind: 'multi',
      fields: {
        left: {
          kind: 'scalar',
          scalar: 'Int',
          mode: 'optional'
        },
        rght: {
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
    })({
      ...commonConfig,
      hooks: {
        resolveInput: async ({ listKey, fieldKey, operation, inputData, item, resolvedData, context }) => {
          let currentItem = {};
          if (item && item.id) {
            currentItem = {
              id: item.id,
              [`${meta.fieldKey}_left`]: item[`${meta.fieldKey}_left`],
              [`${meta.fieldKey}_rght`]: item[`${meta.fieldKey}_rght`],
              [`${meta.fieldKey}_depth`]: item[`${meta.fieldKey}_depth`]
            };
          }
          if (operation === 'update') {
            return moveNode(inputData, context, listKey, fieldKey, currentItem);
          }
          // if (operation === 'delete') {
          //   return deleteResolver(inputData, context, listKey, fieldKey, currentItem);
          // }
          return resolvedData[fieldKey];
        }
      },
      input: {
        where: {
          arg: graphql.arg({ type: NestedSetFilterInput }),
          resolve(value, context) {
            return filterResolver(value, context, meta.listKey, meta.fieldKey);
          }
        },
        create: {
          arg: graphql.arg({ type: NestedSetFieldInput }),
          resolve(value, context) {
            return inputResolver(value, context, meta.listKey, meta.fieldKey);
          }
        },
        update: {
          arg: graphql.arg({ type: NestedSetFieldInput }),
          async resolve(value, context) {
            return updateInputResolver(value, context, meta.listKey, meta.fieldKey);
          }
        },
        orderBy: {
          arg: graphql.arg({ type: orderDirectionEnum }),
          resolve: (direction) => {
            return {
              left: direction
            };
          }
        }
      },
      output: graphql.field({
        type: NestedSetFieldOutput,
        resolve({ value: { left, rght, depth } }) {
          if (left === null || rght === null || depth === null) {
            return null;
          }
          return { left, rght, depth };
        }
      }),
      views: require.resolve('./views'),
      unreferencedConcreteInterfaceImplementations: [NestedSetFieldOutput]
    });
  };
