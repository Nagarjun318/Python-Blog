// IMPORT DRAFT COMPONENTS
const {Editor, EditorState, RichUtils, CompositeDecorator} = Draft;

////////////////////////////
// TAG HANDLING eg. @rkpasia

const TAG_REGEX = /\@[\w]+/g;
function tagHandle(contentBlock, callback) {
  findWithRegex(TAG_REGEX, contentBlock, callback);
}

function findWithRegex(regex, contentBlock, callback) {
  const text = contentBlock.getText();
  let matchArr, start;
  while ((matchArr = regex.exec(text)) !== null) {
    start = matchArr.index;
    callback(start, start + matchArr[0].length);
  }
}

const styles = {
  tag: {
    color: 'rgba(98, 177, 254, 1.0)',
    direction: 'ltr',
    unicodeBidi: 'bidi-override',
  }
}

const Tag = (props) => {
  return <span {...props} style={styles.tag}>{props.children}</span>;
}

// END TAG HANDLING
///////////////////

///////////////////
// EDITOR COMPONENT

class CodepenCommentEditor extends React.Component {

  constructor(props) {
    super(props);

    // Defining decorator
    const compositeDecorator = new CompositeDecorator([
      {
        strategy: tagHandle,
        component: Tag
      }
    ]);

    // Connect the decorator to the obj entity
    this.state = {editorState: EditorState.createEmpty(compositeDecorator)};

    this.focus = () => this.refs.editor.focus();
    this.onChange = (editorState) => this.setState({editorState});

    this.handleKeyCommand = (command) => this._handleKeyCommand(command);
    this.toggleBlockType = (type) => this._toggleBlockType(type);
    this.toggleInlineStyle = (style) => this._toggleInlineStyle(style);
  }

  _handleKeyCommand(command) {
    const {editorState} = this.state;
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      this.onChange(newState);
      return true;
    }
    return false;
  }

  _toggleBlockType(blockType) {
    this.onChange(
      RichUtils.toggleBlockType(
        this.state.editorState,
        blockType
      )
    );
  }

  _toggleInlineStyle(inlineStyle) {
    this.onChange(
      RichUtils.toggleInlineStyle(
        this.state.editorState,
        inlineStyle
      )
    );
  }

  render() {
    const {editorState} = this.state;
    let className = 'CodepenCommentEditor-editor';
    var contentState = editorState.getCurrentContent();
    if (!contentState.hasText()) {
      if (contentState.getBlockMap().first().getType() !== 'unstyled') {
        className += ' CodepenCommentEditor-hidePlaceholder';
      }
    }

    var selectionState = editorState.getSelection();

    if(selectionState.getHasFocus()){
      className += ' CodepenCommentEditor-focus';
    }

    return (
      <div className="CodepenCommentEditor-root">
        <InlineStyleControls
          editorState={editorState}
          onToggle={this.toggleInlineStyle}
        />
        <BlockStyleControls
          editorState={editorState}
          onToggle={this.toggleBlockType}
        />
        <div className={className} onClick={this.focus}>
          <Editor
            blockStyleFn={getBlockStyle}
            customStyleMap={styleMap}
            editorState={editorState}
            handleKeyCommand={this.handleKeyCommand}
            onChange={this.onChange}
            placeholder="Be cool."
            ref="editor"
            spellCheck={true}
          />
        </div>
        <SubmitButton editorState={editorState} />
      </div>
    );
  }
}

// Styles for blocks
const styleMap = {
  CODE: {
    display: 'inline-block',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    fontFamily: '"Inconsolata", "Menlo", "Consolas", monospace',
    fontSize: 16,
    padding: 2,
    marginTop: 3
  },
  LINK: {
    color: '#76daff'
  }
};

function getBlockStyle(block) {
  switch (block.getType()) {
    case 'blockquote': return 'CodepenCommentEditor-blockquote';
    default: return null;
  }
}

////////////////////
// BUTTONS COMPONENT

class StyleButton extends React.Component {
  constructor() {
    super();
    this.onToggle = (e) => {
      e.preventDefault();
      this.props.onToggle(this.props.style);
    };
  }

  render() {
    let className = 'CodepenCommentEditor-styleButton';
    if (this.props.active) {
      className += ' CodepenCommentEditor-activeButton';
    }

    return (
      <span className={className} onMouseDown={this.onToggle}>
        {this.props.label}
      </span>
    );
  }
}

//////////////////////////
// SUBMIT BUTTON COMPONENT

class SubmitButton extends React.Component {
  constructor(props) {
    super(props);

    this.onToggle = (e) => {
      var markup = {
          'BOLD': ['<strong>', '</strong>'],
          'ITALIC': ['<em>', '</em>'],
          'LINK': ['<a href="#">','</a>'],
          'CODE': ['<code>','</code>']
      };
      e.preventDefault();
      var editorState = this.props.editorState;
      console.log(Draft.convertToRaw(editorState.getCurrentContent()));
      console.log(buildMarkup(Draft.convertToRaw(editorState.getCurrentContent()), markup));
      var markuppedBlocks = buildMarkup(Draft.convertToRaw(editorState.getCurrentContent()), markup);
      var commentContent = (blocks) => {
        let commentText = "";
        blocks.forEach((block, index, arr) => {
          if(block.blockType == "unstyled") commentText += "<p>" + block.styledMarkup + "</p>";
          if(block.blockType == "blockquote") commentText += "<blockquote>" + block.styledMarkup + "</blockquote>";
          if(block.blockType == "code-block") commentText += "<div class='box'><pre style='white-space: pre-wrap;'><code>" + block.styledMarkup + "</code></pre></div>";
        });
        return commentText;
      }
      let comment = commentContent(markuppedBlocks);
      $('#comments-container').append(`
          <div class="comment">
        <div class="comment-user">
          <div class="avatar"><img src="//s3-us-west-2.amazonaws.com/s.cdpn.io/49366/profile/profile-80_1.jpg" alt="Riccardo"/></div><span class="user-details"><span class="username">Riccardo </span><span>on </span><span>MARCH 7, 2016</span></span>
        </div>
        <div class="comment-text">
          ${comment}
        </div>
      </div>
      `);
    }
  }

  render(){
    let className = 'CodepenCommentEditor-submitButton';

    return (
      <span className={className} onMouseDown={this.onToggle}>Submit</span>
    );
  }
}

//////////////
// BLOCK TYPES

const BLOCK_TYPES = [
  {label: 'Quote', style: 'blockquote'},
  {label: 'Block Code', style: 'code-block'},
];

const BlockStyleControls = (props) => {
  const {editorState} = props;
  const selection = editorState.getSelection();
  const blockType = editorState
    .getCurrentContent()
    .getBlockForKey(selection.getStartKey())
    .getType();

  return (
    <span className="CodepenCommentEditor-controls">
      {BLOCK_TYPES.map((type) =>
        <StyleButton
          key={type.label}
          active={type.style === blockType}
          label={type.label}
          onToggle={props.onToggle}
          style={type.style}
        />
      )}
    </span>
  );
};

////////////////
// INLINE_STYLES

var INLINE_STYLES = [
  {label: 'Bold', style: 'BOLD'},
  {label: 'Italic', style: 'ITALIC'},
  {label: 'Link', style: 'LINK'},
  {label: 'Inline Code', style: 'CODE'},
];

const InlineStyleControls = (props) => {
  var currentStyle = props.editorState.getCurrentInlineStyle();
  return (
    <span className="CodepenCommentEditor-controls">
      {INLINE_STYLES.map(type =>
        <StyleButton
          key={type.label}
          active={currentStyle.has(type.style)}
          label={type.label}
          onToggle={props.onToggle}
          style={type.style}
        />
      )}
    </span>
  );
};

ReactDOM.render(
  <CodepenCommentEditor />,
  document.getElementById('comment-form')
);

///////////////
// DEPENDENCIES



// values in haystack must be unique
function containsSome(haystack, needles) {
  return haystack.length > _.difference(haystack, needles).length;
}

function relevantStyles(offset, styleRanges) {
  var styles = _.filter(styleRanges, function(range) {
    return (offset >= range.offset && offset < (range.offset + range.length));
  });
  return styles.map(function (style) {return style.style});
}

function buildMarkup(rawDraftContentState, markup) {

  var blocks = rawDraftContentState.blocks;
  return blocks.map(function convertBlock(block) {

    var outputText = [];
    var styleStack = [];
    var text = block.text;
    var ranges = block.inlineStyleRanges;
    var type = block.type;

    // loop over every char in this block's text
    for (var i = 0; i < text.length; i++) {

      // figure out what styles this char and the next char need
      // (regardless of whether there *is* a next char or not)
      var characterStyles = relevantStyles(i, ranges);
      var nextCharacterStyles = relevantStyles(i + 1, ranges);

      // calculate styles to add and remove
      var stylesToAdd = _.difference(characterStyles, styleStack);
      var stylesToRemove = _.difference(characterStyles, nextCharacterStyles);

      // add styles we will need for this char
      stylesToAdd.forEach(function(style) {
        styleStack.push(style);
        outputText.push(markup[style][0]);
      });

      outputText.push(text.substr(i, 1));

      // remove styles we won't need anymore
      while (containsSome(styleStack, stylesToRemove)) {
        var toRemove = styleStack.pop();
        outputText.push(markup[toRemove][1]);
      }
    }

    return {
        blockType: type,
        styledMarkup: outputText.join('')
      }
  });

}
