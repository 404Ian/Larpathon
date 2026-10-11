const fs = require("fs");
const path = require("path");

const icons = JSON.parse(
    fs.readFileSync(path.join(__dirname, "icons.json"), "utf8"),
);
const outDir = path.join(__dirname, "..", "src", "icons");
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

const exportList = [];
const mapEntries = [];

for (const [name, item] of Object.entries(icons)) {
    const fileName = name.replace(/[^a-zA-Z0-9_-]/g, "_") + ".svg";
    fs.writeFileSync(
        path.join(outDir, fileName),
        item.svg.trim() + "\n",
        "utf8",
    );

    // Convert name to PascalCase identifier
    const safeName = name.replace(/[^a-zA-Z0-9]/g, " ");
    const componentName =
        safeName
            .split(/\s+/)
            .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
            .join("") + "Icon";

    const isStroke = item.fill === "none";

    exportList.push(`export const ${componentName} = ({ className = 'ic', ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="${item.viewBox.replace("0 0 ", "0 0 ")}"
    aria-hidden="true"
    className={className}
    ${isStroke ? 'fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"' : 'fill="currentColor"'}
    dangerouslySetInnerHTML={{ __html: ${JSON.stringify(item.body)} }}
    {...props}
  />
);`);

    mapEntries.push(`  '${name}': ${componentName},`);
}

const indexContent = `import React from 'react';

${exportList.join("\n\n")}

export const iconMap: Record<string, React.ComponentType<{ className?: string } & React.SVGProps<SVGSVGElement>>> = {
${mapEntries.join("\n")}
};

export type IconName = keyof typeof iconMap;

export const Icon = ({ name, className = 'ic', ...props }: { name: IconName; className?: string } & React.SVGProps<SVGSVGElement>) => {
  const Comp = iconMap[name] || iconMap.info;
  return <Comp className={className} {...props} />;
};
`;

fs.writeFileSync(path.join(outDir, "index.tsx"), indexContent, "utf8");
console.log(
    "Successfully wrote",
    Object.keys(icons).length,
    "icons to src/icons/",
);
