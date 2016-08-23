
function css(node, attr) {
  const style = window.getComputedStyle(node);
  return parseInt(style.getPropertyValue(attr), 10);
}

function getRelativePos(node, parent) {
  const absPos = node.getBoundingClientRect();
  const absParentPos = parent.getBoundingClientRect();

  return [
    absPos.left - absParentPos.left - css(parent, 'border-left-width'),
    absPos.top - absParentPos.top - css(parent, 'border-top-width'),
  ];
}
