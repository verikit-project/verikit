import {
  Resource,
  RelationshipSchema,
  ResourceSchema,
} from "../resource/resource.js";

/**
 * A single problem found while compiling a set of resources against each other.
 */
export interface CompileIssue {
  /** Name of the resource whose declaration needs fixing. */
  resource: string;
  /**
   * Name of the offending relationship, if the issue is relationship-scoped.
   */
  relationship?: string;
  message: string;
}

/** Validated, name-keyed output of compiling a set of resources together. */
export interface CompiledGraph {
  resources: Record<string, ResourceSchema>;
}

/**
 * Result of compiling a set of resources; mirrors the ValidationResult shape used elsewhere.
 */
export type CompileResult =
  | { success: true; graph: CompiledGraph }
  | { success: false; issues: CompileIssue[] };

function findDuplicateNames(resources: readonly Resource[]): CompileIssue[] {
  const seen = new Set<string>();
  const issues: CompileIssue[] = [];

  for (const resource of resources) {
    if (seen.has(resource.name)) {
      issues.push({
        resource: resource.name,
        message: `Duplicate resource name "${resource.name}".`,
      });
    }
    seen.add(resource.name);
  }

  return issues;
}

function checkForeignKeyField(
  fieldsOwner: ResourceSchema,
  reportedResource: string,
  fieldName: string,
  relationshipName: string,
): CompileIssue | undefined {
  if (Object.hasOwn(fieldsOwner.fields, fieldName)) {
    return undefined;
  }

  return {
    resource: reportedResource,
    relationship: relationshipName,
    message: `Relationship "${relationshipName}" references unknown field "${fieldName}" on resource "${fieldsOwner.name}".`,
  };
}

function checkRelationship(
  owner: ResourceSchema,
  name: string,
  relationship: RelationshipSchema,
  schemasByName: Map<string, ResourceSchema>,
): CompileIssue[] {
  const target = schemasByName.get(relationship.resource);

  if (!target) {
    return [
      {
        resource: owner.name,
        relationship: name,
        message: `Relationship "${name}" references unknown resource "${relationship.resource}".`,
      },
    ];
  }

  const issues: CompileIssue[] = [];

  // Adapter-specific (non-string) foreign keys are opaque to the compiler;
  // only field references produced by `resource.field(...)` are checked.
  // belongsTo stores its foreign key on the owning resource.
  if (
    relationship.relationshipType === "belongsTo" &&
    typeof relationship.foreignKey === "string"
  ) {
    const issue = checkForeignKeyField(
      owner,
      owner.name,
      relationship.foreignKey,
      name,
    );
    if (issue) {
      issues.push(issue);
    }
  }

  // hasMany's foreign key lives on the target resource instead.
  if (
    relationship.relationshipType === "hasMany" &&
    typeof relationship.foreignKey === "string"
  ) {
    const issue = checkForeignKeyField(
      target,
      owner.name,
      relationship.foreignKey,
      name,
    );
    if (issue) {
      issues.push(issue);
    }
  }

  // belongsToMany foreign keys are frequently adapter-specific join descriptors (e.g.
  // `{ left, right }`) rather than a single field on either side. Even string
  // references are ambiguous without knowing whether they point at the owner, target, or join resource, so only the through resource's existence is checked here.
  if (
    relationship.relationshipType === "belongsToMany" &&
    relationship.through !== undefined &&
    !schemasByName.has(relationship.through)
  ) {
    issues.push({
      resource: owner.name,
      relationship: name,
      message: `Relationship "${name}" references unknown through resource "${relationship.through}".`,
    });
  }

  return issues;
}

/**
 * Compiles a set of resources together, cross-checking each
 *  relationship's target resource, foreign key field, and (for belongsToMany) through resource against the other resources in the same set. Each resource is already valid on its own via `.toSchema()`; this only catches problems that only exist once resources are considered together.
 */
export function compile(resources: readonly Resource[]): CompileResult {
  const duplicateIssues = findDuplicateNames(resources);
  if (duplicateIssues.length > 0) {
    return { success: false, issues: duplicateIssues };
  }

  const schemas = resources.map((resource) => resource.toSchema());
  const schemasByName = new Map(schemas.map((schema) => [schema.name, schema]));

  const issues = schemas.flatMap((schema) =>
    Object.entries(schema.relationships).flatMap(([name, relationship]) =>
      checkRelationship(schema, name, relationship, schemasByName),
    ),
  );

  if (issues.length > 0) {
    return { success: false, issues };
  }

  return {
    success: true,
    graph: {
      resources: Object.fromEntries(
        schemas.map((schema) => [schema.name, schema]),
      ),
    },
  };
}
