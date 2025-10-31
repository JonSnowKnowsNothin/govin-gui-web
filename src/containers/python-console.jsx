// import React from "react";
// import Helmet from "react-helmet";
// import PropTypes from "prop-types";
// import "../css/App.css";
// import CodeEditor from '../components/python-console/python-console.jsx';
// import "brace/mode/python";
// // import "brace/theme/monokai";  // Import the dark theme

// import "brace/theme/github";  // Import the light theme

// let logs = [];

// /* eslint-disable */
// console.oldLog = console.log;

// console.log = function (value) {
//   if (value !== "using indexedDB for stdlib modules cache") {
//     console.oldLog(value);
//     logs.push(`${value}`);
//   }
// };
// /* eslint-disable */

// const Scripts = props => {
//   const { code } = props;
//   return <script type="text/python">{code}</script>;
// }

// const output = arr => {
//   let out = "";
//   for (let i = 0; i < arr.length; i += 1) {
//     if (i !== arr.length - 1) {
//       out = out.concat(`${arr[i]}\n`);
//     } else {
//       out = out.concat(arr[i]);
//     }
//   }
//   return out;
// };

// class App extends React.Component {
//   constructor(props) {
//     super(props);
//     this.state = {
//       code: "",
//       outputArr: [],
//     };

//     this.run = this.run.bind(this);
//     this.clearLogs = this.clearLogs.bind(this);
//   }
//   componentDidMount() {
//     // Initialize Brython
//     if (window.__BRYTHON__) {
//       window.__BRYTHON__.brython();
//     } else {
//       document.addEventListener('DOMContentLoaded', () => {
//         window.__BRYTHON__.brython();
//       });
//     }
//   }


//   run() {
//     try {
//       // window.brython([1]);
//       window.__BRYTHON__.brython({ debug: 1 });
//     } catch (error) {
//       console.oldLog(error);
//     }

//     //added setTimeout because console where being updated after 100 ms
//     setTimeout(
//       function () {
//         this.setState({
//           outputArr: logs
//         }),
//           console.oldLog("logsgasga", logs)
//       }
//         .bind(this),
//       100
//     );
//   }

//   clearLogs() {
//     logs = [];
//     this.setState({
//       outputArr: logs
//     });
//   }

//   render() {
//     const { code, outputArr } = this.state;
//     return (
//       <div id="python-editor-container">
//         <Helmet>
//           <script
//             type="application/javascript"
   
//             // src="static/assets/brython.js" 
//             src="https://cdnjs.cloudflare.com/ajax/libs/brython/3.7.1/brython.min.js"
//             // src="https://cdn.jsdelivr.net/npm/brython@3/brython.min.js"
//           />
//           <script
//             type="application/javascript"

//             // src="static/assets/brython_stdlib.js"
//             src="https://cdnjs.cloudflare.com/ajax/libs/brython/3.7.1/brython_stdlib.js"
//             // src="https://cdn.jsdelivr.net/npm/brython@3/brython_stdlib.js"

//           />
//         </Helmet>
//         <Scripts code={code} />
//         <div style={{ display: "flex", gap: "25px", justifyContent: "flex-end", marginTop: "5px" }}>
//           <button
//             type="button"
//             style={{
//               backgroundColor: "#32CD32",
//               color: "#fff",
//               padding: "8px 16px",
//               border: "1px solid #000",
//               borderRadius: "5px",
//               cursor: "pointer",
//               fontSize: "14px",
//             }}
//             onClick={this.run}
//           >
//             Run
//           </button>
//           <button type="button" onClick={this.clearLogs}>
//             Clear
//           </button>
//         </div>
//         <div id="python-editor-input" style={{ marginTop: "10px", width: "80%", marginLeft: "10px", marginRight: "10px" }}>
//           <CodeEditor
//             id="python-code-editor"
//             value={code}
//             mode="python"
//             // theme="monokai"
//             theme="github"
//             onChange={text => this.setState({ code: text })}
//             width={`${(window.innerWidth / 2)}px`}
//             height={`${window.innerHeight}px`}
//             fontSize={"1rem"}
//           />
//         </div>
//         <div id="python-editor-output" style={{ marginTop: "10px", marginRight: "10px", marginLeft: "10px" }}>
//           <textarea
//             id="python-output"
//             readOnly
//             value={output(outputArr)}
//             placeholder="> output goes here..."
//             style={{
//               boxSizing: "border-box",
//               width: "100%",
//               height: "110px",
//               resize: "none",
//               overflow: "auto",
//               border: "1px solid #000",
//               borderRadius: "5px",
//               padding: "10px",
//             }}
//           />
//         </div>
//       </div>
//     );
//   }
// }

// Scripts.propTypes = {
//   code: PropTypes.string.isRequired
// };

// export default App;


import React from 'react';
import Helmet from 'react-helmet';
import PropTypes from 'prop-types';
import '../css/App.css';
import CodeEditor from '../components/python-console/python-console.jsx';
import 'brace/mode/python';
import 'brace/theme/github';


let logs = [];

/* eslint-disable */
console.oldLog = console.log;

console.log = function (value) {
  // Filter out unwanted initialization messages
  if (
      !value.includes("vm") &&
      !value.includes("gui") ) {
    console.oldLog(value);
    logs.push(`${value}`);
  }
};
/* eslint-disable */

const Scripts = props => {
  const { code } = props;
  return <script type="text/python">{code}</script>;
}

const output = arr => {
  let out = "";
  for (let i = 0; i < arr.length; i += 1) {
    if (i !== arr.length - 1) {
      out = out.concat(`${arr[i]}\n`);
    } else {
      out = out.concat(arr[i]);
    }
  }
  return out;
};

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      code: "",
      outputArr: [],
    };

    this.run = this.run.bind(this);
    this.clearLogs = this.clearLogs.bind(this);
    this.saveToFile = this.saveToFile.bind(this);
    this.handleFileUpload = this.handleFileUpload.bind(this);
    this.fileInputRef = React.createRef();
  }

  componentDidMount() {
    // Initialize Brython
    if (!window.__BRYTHON__) {
      document.addEventListener('DOMContentLoaded', () => {
        window.__BRYTHON__.brython();
      });
    }
  }

  run() {
    try {
      // Clear logs before running the new code
      logs = [];
      this.setState({ outputArr: [] });

      // Initialize Brython and run the code
      window.__BRYTHON__.brython({ debug: 1 });

      // Set a timeout to update the state with new logs
      setTimeout(() => {
        const filteredLogs = logs.filter(log => 
          !log.includes("vm") &&
          !log.includes("gui") 
       
        );
        this.setState({ outputArr: filteredLogs });
      }, 100);
    } catch (error) {
      console.oldLog(error);
    }
  }

  clearLogs() {
    logs = [];
    this.setState({
      outputArr: logs
    });
  }

  // Method to save the code content as txt file
  saveToFile() {
    const { code } = this.state;
    const blob = new Blob([code], { type: 'text/plain' });
    const element = document.createElement("a");
    element.href = URL.createObjectURL(blob);
    element.download = "code.py";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  handleFileUpload(event) {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.py')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.setState({ code: e.target.result });
      };
      reader.readAsText(file);
    } else {
      console.error('Please select a valid .txt file.');
    }
  }

  render() {
    const { code, outputArr } = this.state;
    return (
      <div id="python-editor-container">
        <Helmet>
          <script
            type="application/javascript"
            src="https://cdn.jsdelivr.net/npm/brython@3/brython.min.js"
          />
          <script
            type="application/javascript"
            src="https://cdn.jsdelivr.net/npm/brython@3/brython_stdlib.js"
          />
        </Helmet>
        <Scripts code={code} />
        <div style={{ display: "flex", gap: "25px", justifyContent: "flex-end", marginTop: "5px" }}>
          <button
            type="button"
            style={{
              backgroundColor: "#32CD32",
              color: "#fff",
              padding: "8px 16px",
              border: "1px solid #000",
              borderRadius: "5px",
              cursor: "pointer",
              fontSize: "14px",
            }}
            onClick={this.run}
          >
            Run
          </button>
          <button type="button" onClick={this.clearLogs}>
            Clear
          </button>
          <button type="button" onClick={this.saveToFile}>
            Save to File
          </button>
          <button
            type="button"
            onClick={() => this.fileInputRef.current.click()}
          >
            Load from Computer
          </button>
          <input
            type="file"
            accept=".txt"
            style={{ display: 'none' }}
            ref={this.fileInputRef}
            onChange={this.handleFileUpload}
          />
        </div>
        <div id="python-editor-input" style={{ marginTop: "10px", width: "80%", marginLeft: "10px", marginRight: "10px" }}>
          <CodeEditor
            id="python-code-editor"
            value={code}
            mode="python"
            theme="github"
            onChange={text => this.setState({ code: text })}
            width={`${(window.innerWidth / 2)}px`}
            height={`${window.innerHeight}px`}
            fontSize={"1rem"}
          />
        </div>
        <div id="python-editor-output" style={{ marginTop: "10px", marginRight: "10px", marginLeft: "10px" }}>
          <textarea
            id="python-output"
            readOnly
            value={output(outputArr)}
            placeholder="> output goes here..."
            style={{
              boxSizing: "border-box",
              width: "100%",
              height: "110px",
              resize: "none",
              overflow: "auto",
              border: "1px solid #000",
              borderRadius: "5px",
              padding: "10px",
            }}
          />
        </div>
      </div>
    );
  }
}

Scripts.propTypes = {
  code: PropTypes.string.isRequired
};

export default App;