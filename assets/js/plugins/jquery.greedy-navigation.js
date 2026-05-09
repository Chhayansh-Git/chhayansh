/*
 * Responsive Navigation Toggle
 */

var $btn = $('#site-nav button');
var $vlinks = $('#site-nav .visible-links');

$btn.on('click', function () {
  $vlinks.toggleClass('is-open');
  $(this).toggleClass('close');
});