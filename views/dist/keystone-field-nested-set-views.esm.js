import _objectSpread from '@babel/runtime/helpers/esm/objectSpread2';
import { useState, useMemo, useContext, useRef, useEffect, createContext, Fragment } from 'react';
import { jsx, useTheme } from '@keystone-ui/core';
import { Select, selectComponents, FieldContainer, FieldLabel } from '@keystone-ui/fields';
import { useList } from '@keystone-6/core/admin-ui/context';
import Link from 'next/link';
import { CellContainer } from '@keystone-6/core/admin-ui/components';
import _objectWithoutProperties from '@babel/runtime/helpers/esm/objectWithoutProperties';
import _toPropertyKey from '@babel/runtime/helpers/esm/toPropertyKey';
import 'intersection-observer';
import { validate } from 'uuid';
import { gql, useApolloClient, ApolloClient, InMemoryCache, useQuery } from '@keystone-6/core/admin-ui/apollo';

const _excluded = ["children"];

function useIntersectionObserver(cb, ref) {
  const cbRef = useRef(cb);
  useEffect(() => {
    cbRef.current = cb;
  });
  useEffect(() => {
    let observer = new IntersectionObserver(function () {
      return cbRef.current(...arguments);
    }, {});
    let node = ref.current;

    if (node !== null) {
      observer.observe(node);
      return () => observer.unobserve(node);
    }
  }, [ref]);
}

const idValidators = {
  uuid: validate,

  cuid(value) {
    return value.startsWith('c');
  },

  autoincrement(value) {
    return /^\d+$/.test(value);
  }

};

function useDebouncedValue(value, limitMs) {
  const [debouncedValue, setDebouncedValue] = useState(() => value);
  useEffect(() => {
    let id = setTimeout(() => {
      setDebouncedValue(() => value);
    }, limitMs);
    return () => {
      clearTimeout(id);
    };
  }, [value, limitMs]);
  return debouncedValue;
}

function useFilter(search, list) {
  return useMemo(() => {
    let conditions = [];

    if (search.length) {
      const idFieldKind = list.fields.id.controller.idFieldKind;
      const trimmedSearch = search.trim();
      const isValidId = idValidators[idFieldKind](trimmedSearch);

      if (isValidId) {
        conditions.push({
          id: {
            equals: trimmedSearch
          }
        });
      }

      for (const field of Object.values(list.fields)) {
        if (field.search !== null) {
          conditions.push({
            [field.path]: {
              contains: trimmedSearch,
              mode: field.search === 'insensitive' ? 'insensitive' : undefined
            }
          });
        }
      }
    }

    return {
      OR: conditions
    };
  }, [search, list]);
}

const initialItemsToLoad = 10;
const subsequentItemsToLoad = 50;
const idField = '____id____';
const labelField = '____label____';
const LoadingIndicatorContext = /*#__PURE__*/createContext({
  count: 0,
  ref: () => {}
});
const RelationshipSelect = _ref => {
  var _data$items;

  let {
    autoFocus,
    controlShouldRenderValue,
    isDisabled,
    isLoading,
    list,
    placeholder,
    portalMenu,
    state,
    field
  } = _ref;
  const [search, setSearch] = useState(''); // note it's important that this is in state rather than a ref
  // because we want a re-render if the element changes
  // so that we can register the intersection observer
  // on the right element

  const [loadingIndicatorElement, setLoadingIndicatorElement] = useState(null);
  const QUERY = gql`
    query NestedSetSelect($where: ${list.gqlNames.whereInputName}!, $take: Int!, $skip: Int!) {
      items: ${list.gqlNames.listQueryName}(where: $where, take: $take, skip: $skip) {
        ${idField}: id
        ${labelField}: ${list.labelField}
        ${field} {
          parent
          left
          right
          depth
        }
      }
      count: ${list.gqlNames.listQueryCountName}(where: $where)
    }
  `;
  const debouncedSearch = useDebouncedValue(search, 200);
  const where = useFilter(debouncedSearch, list);
  const link = useApolloClient().link; // we're using a local apollo client here because writing a global implementation of the typePolicies
  // would require making assumptions about how pagination should work which won't always be right

  const apolloClient = useMemo(() => new ApolloClient({
    link,
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            [list.gqlNames.listQueryName]: {
              keyArgs: ['where'],
              merge: (existing, incoming, _ref2) => {
                let {
                  args
                } = _ref2;
                const merged = existing ? existing.slice() : [];
                const {
                  skip
                } = args;

                for (let i = 0; i < incoming.length; ++i) {
                  merged[skip + i] = incoming[i];
                }

                return merged;
              }
            }
          }
        }
      }
    })
  }), [link, list.gqlNames.listQueryName]);
  const {
    data,
    error,
    loading,
    fetchMore
  } = useQuery(QUERY, {
    fetchPolicy: 'network-only',
    variables: {
      where,
      take: initialItemsToLoad,
      skip: 0
    },
    client: apolloClient
  });
  const count = (data === null || data === void 0 ? void 0 : data.count) || 0;
  const options = (data === null || data === void 0 ? void 0 : (_data$items = data.items) === null || _data$items === void 0 ? void 0 : _data$items.map(_ref3 => {
    let {
      [idField]: value,
      [labelField]: label
    } = _ref3,
        data = _objectWithoutProperties(_ref3, [idField, labelField].map(_toPropertyKey));

    return {
      value,
      label: label || value,
      data
    };
  })) || [];
  const loadingIndicatorContextVal = useMemo(() => ({
    count,
    ref: setLoadingIndicatorElement
  }), [count]); // we want to avoid fetching more again and `loading` from Apollo
  // doesn't seem to become true when fetching more

  const [lastFetchMore, setLastFetchMore] = useState(null);
  useIntersectionObserver(_ref4 => {
    let [{
      isIntersecting
    }] = _ref4;
    const skip = data === null || data === void 0 ? void 0 : data.items.length;

    if (!loading && skip && isIntersecting && options.length < count && ((lastFetchMore === null || lastFetchMore === void 0 ? void 0 : lastFetchMore.where) !== where || (lastFetchMore === null || lastFetchMore === void 0 ? void 0 : lastFetchMore.list) !== list || (lastFetchMore === null || lastFetchMore === void 0 ? void 0 : lastFetchMore.skip) !== skip)) {
      const QUERY = gql`
              query NestedSetSelectMore($where: ${list.gqlNames.whereInputName}!, $take: Int!, $skip: Int!) {
                items: ${list.gqlNames.listQueryName}(where: $where, take: $take, skip: $skip) {
                  ${labelField}: ${list.labelField}
                  ${idField}: id
                }
              }
            `;
      setLastFetchMore({
        list,
        skip,
        where
      });
      fetchMore({
        query: QUERY,
        variables: {
          where,
          take: subsequentItemsToLoad,
          skip
        }
      }).then(() => {
        setLastFetchMore(null);
      }).catch(() => {
        setLastFetchMore(null);
      });
    }
  }, {
    current: loadingIndicatorElement
  }); // TODO: better error UI
  // TODO: Handle permission errors
  // (ie; user has permission to read this relationship field, but
  // not the related list, or some items on the list)

  if (error) {
    return jsx("span", null, "Error");
  }

  return jsx(LoadingIndicatorContext.Provider, {
    value: loadingIndicatorContextVal
  }, jsx(Select // this is necessary because react-select passes a second argument to onInputChange
  // and useState setters log a warning if a second argument is passed
  , {
    onInputChange: val => setSearch(val),
    isLoading: loading || isLoading,
    autoFocus: autoFocus,
    components: relationshipSelectComponents,
    portalMenu: portalMenu,
    value: state.value ? {
      value: state.value.id,
      label: state.value.label,
      // @ts-ignore
      data: state.value.data
    } : null,
    options: options,
    onChange: value => {
      state.onChange(value ? {
        id: value.value,
        label: value.label,
        data: value.data
      } : null);
    },
    placeholder: placeholder,
    controlShouldRenderValue: controlShouldRenderValue,
    isClearable: controlShouldRenderValue,
    isDisabled: isDisabled
  }));
};
const relationshipSelectComponents = {
  MenuList: _ref5 => {
    let {
      children
    } = _ref5,
        props = _objectWithoutProperties(_ref5, _excluded);

    const {
      count,
      ref
    } = useContext(LoadingIndicatorContext);
    return jsx(selectComponents.MenuList, props, children, jsx("div", {
      css: {
        textAlign: 'center'
      },
      ref: ref
    }, props.options.length < count && jsx("span", {
      css: {
        padding: 8
      }
    }, "Loading...")));
  }
};

const Field = _ref => {
  let {
    field,
    value,
    onChange
  } = _ref;
  const list = useList(field.listKey);
  return jsx(FieldContainer, {
    as: "fieldset"
  }, jsx(Fragment, null, jsx(FieldLabel, {
    htmlFor: field.path
  }, field.label), jsx(RelationshipSelect, {
    controlShouldRenderValue: true,
    list: list,
    isLoading: false,
    field: field.path,
    isDisabled: onChange === undefined,
    state: {
      value,

      onChange(newVal) {
        onChange === null || onChange === void 0 ? void 0 : onChange(_objectSpread(_objectSpread({}, value), {}, {
          value: newVal
        }));
      }

    }
  })));
};
const Cell = _ref2 => {
  let {
    field,
    item
  } = _ref2;
  const list = useList(field.listKey);
  const {
    colors
  } = useTheme();
  const data = item[field.path];
  const items = (Array.isArray(data) ? data : [data]).filter(item => item);
  const displayItems = items.length < 5 ? items : items.slice(0, 3);
  const overflow = items.length < 5 ? 0 : items.length - 3;
  const styles = {
    color: colors.foreground,
    textDecoration: 'none',
    ':hover': {
      textDecoration: 'underline'
    }
  };
  return jsx(CellContainer, null, displayItems.map((item, index) => jsx(Fragment, {
    key: item.id
  }, !!index ? ', ' : '', jsx(Link, {
    href: `/${list.path}/[id]`,
    as: `/${list.path}/${item.id}`,
    css: styles
  }, item.label || item.id))), overflow ? `, and ${overflow} more` : null);
};
const CardValue = _ref3 => {
  let {
    field
  } = _ref3;
  return jsx(FieldContainer, null, jsx(FieldLabel, null, field.label));
};
const controller = config => {
  return {
    path: config.path,
    label: config.label,
    listKey: config.listKey,
    defaultValue: {
      id: null,
      value: null,
      initialValue: null
    },
    graphqlSelection: `${config.path} {
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
          depth: value.depth
        }
      };
    },

    serialize: value => ({
      [config.path]: value
    })
  };
};

export { CardValue, Cell, Field, controller };
