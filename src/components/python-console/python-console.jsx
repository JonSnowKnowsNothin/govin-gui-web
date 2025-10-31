import React from "react";
import PropTypes from "prop-types";
import AceEditor from "react-ace";

class CodeEditor extends React.PureComponent {
  constructor(props) {
    super(props);

    const { value } = this.props;

    this.state = {
      value
    };
  }

  componentDidUpdate(prevProps) {
    const { value } = this.props;

    if (prevProps.value !== value) {
      this.setState({ value });
    }
  }

  render() {
    const { value } = this.state;
    const { onChange } = this.props;

    return (
      <AceEditor
        theme="twilight"
        showPrintMargin={false}
        editorProps={{ $blockScrolling: true }}
        {...this.props}
        onChange={(newValue) => {
          this.setState({ value: newValue });
          if (onChange) {
            onChange(newValue);
          }
        }}
        value={value}
        width={`${window.innerWidth - 90}px`}
        height={`${window.innerHeight / 2}px`}
        style={{
          border: "1px solid #000", // Border style
          borderRadius: "5px", // Optional: add border radius
          padding: "10px", // Optional: add padding
        }}
        fontSize={"1.2rem"}
      />
    );
  }
}

CodeEditor.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func
};

CodeEditor.defaultProps = {
  value: "",
  onChange: () => null
};

export default CodeEditor;