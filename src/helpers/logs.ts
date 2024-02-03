import { execSync } from "child_process";
import chalk from "chalk";
import CLIBox from "cli-box";

type ChalkColors =
  | "green"
  | "blue"
  | "red"
  | "gray"
  | "greenBright"
  | "blueBright"
  | "redBright"
  | "yellow"
  | "yellowBright"
  | "magenta"
  | "magentaBright";

type CenteredBoxParams = {
  boxColor: ChalkColors;
  text: string;
  inner: {
    h: number;
    w: number;
  };
  outer: {
    h: number;
    w: number;
  };
};
const centeredBox = ({
  boxColor,
  text,
  inner,
  outer,
}: CenteredBoxParams): CLIBox => {
  const innerBox = new CLIBox(
    {
      w: inner.w,
      h: inner.h,
      stringify: false,
      marks: {
        nw: "",
        n: "",
        ne: "",
        e: "",
        se: "",
        s: "",
        sw: "",
        w: "",
      },
    },
    {
      text,
      hAlign: "left",
    },
  );
  const outerBox = new CLIBox(
    {
      w: outer.w,
      h: outer.h,
      stringify: false,
      marks: {
        nw: chalk[boxColor]("╭"),
        n: chalk[boxColor]("─"),
        ne: chalk[boxColor]("╮"),
        e: chalk[boxColor]("│"),
        se: chalk[boxColor]("╯"),
        s: chalk[boxColor]("─"),
        sw: chalk[boxColor]("╰"),
        w: chalk[boxColor]("│"),
      },
    },
    {
      text: innerBox.stringify(),
      hAlign: "middle",
    },
  );

  return outerBox;
};

export const logServerStatus = (
  env: string,
  port: number,
  endpoint: string,
) => {
  const host = process.env.HOST || "http://localhost";

  if (env === "development") {
    const ip = execSync("ipconfig getifaddr en0")
      .toString()
      .trim();

    const lines = [
      `${chalk.green("Compiled successfully!")}`,
      "",
      "You can now access the API in your browser.",
      "",
      `  Local:           ${host}:${port}${endpoint}`,
      `  On Your Network: http://${ip}:${port}${endpoint}`,
      "",
      `Note that the development build is not optimized.`,
      `To create a production build, use ${chalk.blue("yarn build")}`,
      `To run the production build locally, use ${chalk.blue("yarn start")}`,
    ];
    const b = centeredBox({
      boxColor: "green",
      text: lines.join("\n"),
      inner: {
        w: 55,
        h: 10,
      },
      outer: {
        w: 75,
        h: 15,
      },
    });

    console.log(b.stringify());
  } else {
    const lines = [
      chalk.green(`Serving optimized production build!`),
      "",
      `🔥 API is now live at: ${chalk.blue(`${host}:${port}${endpoint}`)}`,
    ];
    const b = centeredBox({
      boxColor: "green",
      text: lines.join("\n"),
      inner: {
        w: 55,
        h: 5,
      },
      outer: {
        w: 75,
        h: 10,
      },
    });
    console.log(b.stringify());
  }
};
