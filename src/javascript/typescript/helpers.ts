import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLString,
  GraphQLType,
} from 'graphql'

import * as t from '@babel/types';

import { CompilerOptions } from '../../compiler';
import * as Inflector from 'inflected';
import { createTypeFromGraphQLTypeFn } from '../flow/helpers';

const builtInScalarMap = {
  [GraphQLString.name]: t.TSStringKeyword(),
  [GraphQLInt.name]: t.TSNumberKeyword(),
  [GraphQLFloat.name]: t.TSNumberKeyword(),
  [GraphQLBoolean.name]: t.TSBooleanKeyword(),
  [GraphQLID.name]: t.TSStringKeyword(),
}

export interface TypeFromGraphQLTypeOptions {
  replaceObjectTypeIdentifierWith?: t.Identifier;
}

type createTypeFromGraphQLTypeFn = (
  graphQLType: GraphQLType,
  options?: TypeFromGraphQLTypeOptions
) => t.TSType;

export function createTypeFromGraphQLTypeFunction(
  compilerOptions: CompilerOptions
): createTypeFromGraphQLTypeFn {
  return function typeFromGraphQLType(graphQLType: GraphQLType, {
    nullable = true,
    replaceObjectTypeIdentifierWith
  }: {
    nullable?: boolean;
    replaceObjectTypeIdentifierWith?: t.Identifier
  } = {
    nullable: true
  }): t.TSType {
    if (graphQLType instanceof GraphQLNonNull) {
      return typeFromGraphQLType(
        graphQLType.ofType,
        { nullable: false, replaceObjectTypeIdentifierWith }
      );
    }

    if (graphQLType instanceof GraphQLList) {
      const elementType = typeFromGraphQLType(graphQLType.ofType, { replaceObjectTypeIdentifierWith, nullable: true });
      const type = t.TSArrayType(
        t.isTSUnionType(elementType) ? t.TSParenthesizedType(elementType) : elementType
      );
      if (nullable) {
        return t.TSUnionType([type, t.TSNullKeyword()]);
      } else {
        return type;
      }
    }

    let type: t.TSType;
    if (graphQLType instanceof GraphQLScalarType) {
      const builtIn = builtInScalarMap[graphQLType.name]
      if (builtIn) {
        type = builtIn;
      } else {
        if (compilerOptions.passthroughCustomScalars) {
          type = t.TSAnyKeyword();
        } else {
          type = t.TSTypeReference(
            t.identifier(graphQLType.name)
          );
        }
      }
    } else {
      type = t.TSTypeReference(
        replaceObjectTypeIdentifierWith ? replaceObjectTypeIdentifierWith : t.identifier(graphQLType.name)
      );
    }

    if (nullable) {
      return t.TSUnionType([type, t.TSNullKeyword()]);
    } else {
      return type;
    }
  }
}
