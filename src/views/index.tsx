/** @jsxRuntime classic */
/** @jsx jsx */
import { Fragment } from 'react';
import { jsx, useTheme } from '@keystone-ui/core';
import { FieldContainer, FieldLabel } from '@keystone-ui/fields';
// import { Text } from '@keystone-ui/core';
import {
  CardValueComponent,
  CellComponent,
  FieldController,
  FieldControllerConfig,
  FieldProps,
  // ListMeta
} from '../../../../types';

import { useList } from '../../../../admin-ui/context';
import { Link } from '../../../../admin-ui/router';
import { CellContainer } from '../../../../admin-ui/components';
import { RelationshipSelect } from './RelationshipSelect';

export const Field = ({
  field,
  value,
  onChange,
  // autoFocus,
  // forceValidation,
}: FieldProps<typeof controller>) => {
  const list = useList(field.listKey);
  return (
    <FieldContainer as="fieldset">
      <Fragment>
        <FieldLabel htmlFor={field.path}>{field.label}</FieldLabel>
        <RelationshipSelect
          controlShouldRenderValue
          list={list}
          isLoading={false}
          field={field.path}
          isDisabled={onChange === undefined}
          state={{
            value,
            onChange(newVal) {
              onChange?.({ ...value, value: newVal });
            },
          }}
        />
      </Fragment>
    </FieldContainer>
  );
};

export const Cell: CellComponent<typeof controller> = ({ field, item }) => {
  const list = useList(field.listKey);
  const { colors } = useTheme();

  const data = item[field.path];
  const items = (Array.isArray(data) ? data : [data]).filter(item => item);
  const displayItems = items.length < 5 ? items : items.slice(0, 3);
  const overflow = items.length < 5 ? 0 : items.length - 3;
  const styles = {
    color: colors.foreground,
    textDecoration: 'none',

    ':hover': {
      textDecoration: 'underline',
    },
  } as const;

  return (
    <CellContainer>
      {displayItems.map((item, index) => (
        <Fragment key={item.id}>
          {!!index ? ', ' : ''}
          <Link href={`/${list.path}/[id]`} as={`/${list.path}/${item.id}`} css={styles}>
            {item.label || item.id}
          </Link>
        </Fragment>
      ))}
      {overflow ? `, and ${overflow} more` : null}
    </CellContainer>
  );
};

export const CardValue: CardValueComponent<typeof controller> = ({ field }) => {
  return (
    <FieldContainer>
      <FieldLabel>{field.label}</FieldLabel>
    </FieldContainer>
  );
};

export type NestedSetValue = {
  id: string | null;
  initialValue: { label: string; id: string; } | null;
  value: { label: string; id: string; } | null;
}

type NestedSetController = FieldController<NestedSetValue>;

export const controller = (
  config: FieldControllerConfig): FieldController<NestedSetController> => {
  console.log('config: ', config);
  return {
    path: config.path,
    label: config.label,
    listKey: config.listKey,
    defaultValue: { id: null, value: null, initialValue: null },
    graphqlSelection:
      `${config.path} {
        parent
        left
        right
        depth
    }`,
    deserialize(item) {
      const value = item[config.path];
      return {
        data: {
          parent: value.parent,
          left: value.left,
          right: value.right,
          depth: value.depth,
        },
      };
    },
    serialize: value => ({ [config.path]: value }),
  };
};
