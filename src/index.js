export default function({ types: t }) {
  const buildScope = (path, scope = []) => {
    const functionParent = path.getFunctionParent();
    if (!functionParent) {
      return scope;
    }
    if (functionParent.isFunctionDeclaration()) {
      scope.push(functionParent.node.id.name);
    } else if (
      t.isClassProperty(functionParent) || t.isClassMethod(functionParent)
    ) {
      scope.push(functionParent.node.key.name);
      const classBody = functionParent.findParent(
        path => path.isClassDeclaration() || path.isClassExpression()
      );
      if (classBody) {
        scope.push(classBody.node.id.name);
        return buildScope(classBody, scope);
      }
    } else if (functionParent.isArrowFunctionExpression()) {
      const arrFuncParent = functionParent.findParent(path => path);
      if (t.isVariableDeclarator(arrFuncParent)) {
        scope.push(arrFuncParent.node.id.name);
      } else if (
        t.isClassProperty(arrFuncParent) || t.isClassMethod(arrFuncParent)
      ) {
        scope.push(arrFuncParent.node.key.name);
        const classBody = arrFuncParent.findParent(
          path => path.isClassDeclaration() || path.isClassExpression()
        );
        if (classBody) {
          scope.push(classBody.node.id.name);
          return buildScope(classBody, scope);
        }
      } else if (t.isCallExpression(arrFuncParent)) {
        const { callee } = arrFuncParent.node;
        scope.push(`[${callee.object.name}.${callee.property.name}]`);
      }
    }
    return buildScope(functionParent, scope);
  };

  const injectVariableNames = (args = []) => {
    return args.reduce((acc, arg) => {
      if (t.isIdentifier(arg)) {
        return [...acc, t.stringLiteral(arg.name), arg];
      }
      return [...acc, arg];
    }, []);
  };

  return {
    name: "babel-plugin-captains-log", // not required
    visitor: {
      MemberExpression(path) {
        if (path.get("object").isIdentifier({ name: "console" })) {
          if (path.parent.arguments && Array.isArray(path.parent.arguments)) {
            // add variable names
            path.parent.arguments = injectVariableNames(path.parent.arguments);
            // prepend console statement scope
            const scope = buildScope(path);
            path.parent.arguments.unshift(
              t.stringLiteral(`${scope.reverse().join(".")}:`)
            );
          }
        }
      }
    }
  };
}
