import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

const snake = (s: string) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/__+/g, '_')
    .toLowerCase();

/** camelCase de las entidades -> snake_case en PostgreSQL. */
export class SnakeNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  columnName(propertyName: string, customName: string, prefixes: string[]) {
    return customName ?? snake([...prefixes, propertyName].join('_'));
  }
  relationName(propertyName: string) {
    return snake(propertyName);
  }
  joinColumnName(relationName: string, referencedColumnName: string) {
    return snake(`${relationName}_${referencedColumnName}`);
  }
  joinTableColumnName(
    tableName: string,
    propertyName: string,
    columnName?: string,
  ) {
    return snake(`${tableName}_${columnName ?? propertyName}`);
  }
}
