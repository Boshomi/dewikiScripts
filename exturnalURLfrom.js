/*
 * [[:Category:Benutzer:ⵓ/Scripts]]
 */
/**
 *
 * Das ist ein Fork von [[Benutzer:TMg/weblinkChecker]]
 * Hilfeseiten und stabile Version siehe dort.
 * Eine getestete Version findet sich auf Benutzer:ExURLBot/externalURLform.js
 *
 *
 * (<nowiki> zur Umgehung von [[bugzilla:8761]].)
 *
 * Änderungen zum Original:
 * * externalURLform => externalURLform
 * * weblink-Checker => externalURL-form
 * * //upload.wikimedia.org/wikipedia/commons/thumb/7/72/Crystal_wp.png/22px-Crystal_wp.png
 * * => https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Oxygen480-categories-preferences-system-network.svg/22px-Oxygen480-categories-preferences-system-network.svg.png
 * * Unterstützung für weitere Archive.is TLDs
 * * Verlinkung auf Mementoweb statt auf Webcitation
 * * Suchlink für Archive.today
 * * verbesserte Sortierfunktion der Spalte Recherche, Sortierung nach Farben
 * * Protokollerkennung und Ergänzung, Unterstüzung für https bei Archive-URLs
 * * Verbesserter Umgang mit nicht normgerechten Zeitstempel bei wayback und archive.today
 * * Umstellung der HTML-Tabelle
 *
 * Unterstützung der Vorlage BBKL
 *
 * Neue Funktion:
 * * Aufruf von autoDiff.js
 * * Unterstützung zur Entfernung von InternetArchiveBot-Meldungen
 */
( function( $, mw ) {
	if ( !document.forms.editform
		|| ( mw.config.get( 'wgAction' ) !== 'edit' && mw.config.get( 'wgAction' ) !== 'submit' ) ) {
		return;
	}
	mw.util.addCSS(
	`#linkCheckerBox table a { padding: .2em 1px; }
	#linkCheckerBox table a:hover { background: #0645AD; border-radius: 2px; color: #FFF; text-decoration: none; }
	#linkCheckerBox tr:hover { background: #DFE7F4; }
	#linkCheckerBox tr.hintergrundfarbe1:hover { background: #f8f9fa; }
	#linkCheckerBox tr.hintergrundfarbe2:hover { background: #ffffff; }
	#linkCheckerBox tr.hintergrundfarbe3:hover { background: #ffff40; }
	#linkCheckerBox tr.hintergrundfarbe4:hover { background: #ffaa00; }
	#linkCheckerBox tr.hintergrundfarbe5:hover { background: #eaecf0; }
	#linkCheckerBox tr.hintergrundfarbe6:hover { background: #b3b7ff; }
	#linkCheckerBox tr.hintergrundfarbe7:hover { background: #ffcbcb; }
	#linkCheckerBox tr.hintergrundfarbe8:hover { background: #ffebad; }
	#linkCheckerBox tr.hintergrundfarbe9:hover { background: #b9ffc5; }
	#linkCheckerBox td:nth-child(1) { word-break:break-all;}
	#linkCheckerBox td:nth-child(2) { word-break: break-word;}
	#linkCheckerBox td:nth-child(3) { word-break: break-word;}
	#linkCheckerBox td:nth-child(4) { word-break: break-word;}
	#linkCheckerBox td:nth-child(5) { word-break: break-word;}
	//-moz-box-sizing: border-box; box-sizing: border-box; width: 100%;
	#linkCheckerBox td input { border:0px solid #000; margin:0; width:100%; height:100% }`);
	const iconuri = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Oxygen480-categories-preferences-system-network.svg/22px-Oxygen480-categories-preferences-system-network.svg.png';
	if ( mw.user.options.get( 'usebetatoolbar' ) ) {
		mw.loader.using( 'ext.wikiEditor', function() {
			$( document ).ready( function() {
				$( '#wpTextbox1' ).wikiEditor( 'addToToolbar', {
					'section': 'main',
					'group': 'insert',
					'tools': {
						'externalURLform': {
							'label': 'externalURL-form',
							'type': 'button',
							'icon': iconuri,
							'action': {
								'type': 'callback',
								'execute': function() { return click(this); }
							}
						}
					}
				} );
			} );
		} );
	} else if ( mw.user.options.get( 'showtoolbar' ) ) {
		mw.loader.using( 'mediawiki.action.edit', function() {
			mw.toolbar.addButton( iconuri,
									'externalURL-form', '', '', '', 'mw-customeditbutton-externalURLform' );
			$( function() {
				$( '#mw-customeditbutton-externalURLform' ).click( function() { return click( this ); } );
			} );
		} );
	} else {
		$( document ).ready( function() {
			/* Notfalls als Link unter dem Bearbeitungsfenster */
			const mybutton = $( '.editButtons' );
			const mybuttonchild = mybutton.children().last();
			( mybuttonchild.is( 'span' ) ? mybuttonchild : mybutton ).append( $( '.mw-editButtons-pipe-separator', mybutton ).first().clone() );
			const myahref = $( '<a href="#">externalURL-form</a>' );
			myahref.click( function() { return click( this ); } );
			mybutton.append( myahref );
		} );
	}
	function click( btnCallback ) {
		const myoptions= {autoLimit: option( 'autoLimit' ),
			context: option( 'context'),
			search: option( 'search' )}
		mw.loader.using( 'jquery.tablesorter', loadLinkChecker( myoptions ) );
		return false;
	}
	function loadLinkChecker(myoptions) { /*myoptions.autoLimit, myoptions.context, myoptions.search*/
		if ( window.wikEd && window.wikEd.useWikEd ) {
			wikEd.UpdateTextarea();
		}
		const editformElements = document.forms['editform'].elements;
		const textbox = editformElements['wpTextbox1'];
		const summary = editformElements['wpSummary'];
		if ( !textbox ) {
			return;
		}
		const textboxValue = textbox.value;
		/* See includes/parser/Parser.php */
		const regexGetURL = /\bhttps?:\/\/[^\][<>"\x00-\x20\x7F|]*[^\][<>"\x00-\x20\x7F,;\\.:!?)|}]/gi;
		let urlMatch;
		let urlList = [];
		while (( urlMatch = regexGetURL.exec(textboxValue))) {
			urlMatch.number = -1;
			for ( let position = urlMatch.index; position >= 0; urlMatch.number++ ) {
				position = position < urlMatch[0].length ? -1 : textboxValue.lastIndexOf( urlMatch[0], position - urlMatch[0].length );
			}
			urlList.push( urlMatch );
		}
		htmlTable(textboxValue , urlList,  myoptions );
		let jQboxTable = $( '#linkCheckerBox table' );
		if (jQboxTable.tablesorter ) {
				jQboxTable.tablesorter();
			}
		$( '#linkCheckerBox a.goto' ).on( 'click', function() {
			if ( window.wikEd && window.wikEd.useWikEd ) {
				wikEd.UpdateTextarea();
			}
			let tbvalue = textbox.value;
			let tbindex = -1;
			for (let n = this.getAttribute('data-number'); n >= 0; n--)
				tbindex = tbvalue.indexOf(this.getAttribute('data-uri'), tbindex + 1);
			if (tbindex < 0) {
				return false;}
			textbox.focus();
			if ( typeof textbox.selectionStart === 'number' ) {
				textbox.selectionStart = tbindex;
				textbox.selectionEnd = tbindex + this.getAttribute('data-uri').length;
			} else if ( typeof textbox.selection === 'object' ) {
				let range = textbox.selection.createRange();
				range.move('character', tbindex);
				range.moveEnd('character', this.getAttribute('data-uri').length);
			}
			return false;
		} );
		$( '#linkCheckerBox form:first-child' ).on( 'submit', function() {
			if ( window.wikEd && window.wikEd.useWikEd ) {
				wikEd.UpdateTextarea();
			}
			let t = textbox.value,
			count = 0;
			for ( let i = urlList.length; i--; ) {
				let p = -urlList[i][0].length;
				for ( var n = urlList[i].number; n >= 0; n-- ) {
					p = t.indexOf( urlList[i][0], p + urlList[i][0].length );
				}
				if ( p < 0 ) {
					continue;}
				if ( !this.elements['r' + i] ) {
					continue;}
				var r = this.elements['r' + i].value.replace( /^\s+|\s+$/g, '' ) || urlList[i][0];
				var text = this.elements['t' + i].value.replace( /^\s+|\s+$/g, '' );
				var tree = createContextTree( t, p, p + urlList[i][0].length ), node = tree;
				if ( !tree ) {
					continue;}
				if ( tree.archive && r && r !== urlList[i][0] ) {
					tree.archive = false;}
				var archive = tree.archive || parseWebarchiv( r );
				if ( /^W(?:aybackarchiv|BA)$/i.test( node.parent.type )
					|| ( /^(?:Toter|Dead) Link$/i.test( node.parent.type ) && r !== urlList[i][0] ) ) {
					node = node.parent;
				}
				var de = node.parent.type === 'Internetquelle';
				var isCite = de || /^(?:Internetquelle|Cite (?:book|journal|news|web)|BBKL)$/.test( node.parent.type );
				if ( isCite ) {
					/* Drop misspelled parameters */
					deleteParameter( node.parent.parameters, ['archivurl', 'archivdate', 'archivdatum', 'archivebot', 'archiv-bot',
						'archive-datum', 'archvieurl', 'archviedate', 'archiveurl', 'archivedate',
						'web-archiv', 'webarchiv', 'https?:\\/\\/[^=|]*'] );
				}
				if ( archive ) {
					if ( isCite ) {
						node = node.parent;
						/* deleteParameter( node.parameters, 'offline' );  */
						putParameter( node.parameters, node.parameter || 'url', archive.url || urlList[i][0], 0 );
						putParameter( node.parameters, de ? 'titel' : 'title', text, 1 );
						var where = de ? ['url', 'titel', 'titelerg', 'werk', 'seiten', 'datum', 'archiv-url','abruf'] :
						['url', 'title', 'accessdate', 'last', 'first', 'authorlink', 'coauthors',
						'date', 'format', 'work', 'publisher', 'pages', 'language', 'archive-url','archiveurl'];
						putParameter( node.parameters, de ? 'archiv-url' : 'archive-url', archive.archive || '', where );
						putParameter( node.parameters, de ? 'archiv-datum' : 'archive-date', archive.date || '', where );
						r = node.parameters.join( '' );
					} else {
						if ( node.parent.type === 'LINK' || node.parent.type === 'Webarchiv' ){
							node = node.parent;}
						//<nowiki>
						r = '{{Webarchiv | url=' + ( archive.url || urlList[i][0] ) + ' | ' + ( archive.id
						? 'webciteID=' + archive.id : archive.is
						? 'archive-is=' + archive.is
						: 'wayback=' + archive.timestamp ) + ' | text=' + text.replace( /\|+(?![^{}]*\}\})/g, '–' ) + '}}';
						//</nowiki>
					}
				} else if ( isCite ) {
					node = node.parent;
					deleteParameter( node.parameters, ['archiv-url', 'archiv-datum'] );
					/* if ( r !== urlList[i][0] ) deleteParameter( node.parameters, 'offline' );   */
					putParameter( node.parameters, node.parameter || 'url', r, 0 );
					putParameter( node.parameters, de ? 'titel' : 'title', text, 1 );
					r = node.parameters.join( '' );
				} else if ( node.parent.type === 'LINK'
					|| node.parent.type === 'Webarchiv'
					|| ( text && ( !node.parent || node.parent.type === 'REF' ) ) ) {
					r = '[' + r + (text ? ' ' + text : '') + ']';
					if ( node.parent && node.parent.type !== 'REF' ) {
						node = node.parent;}
				}
				if ( r === t.slice( node.start, node.end ) ) {
					continue;}
				t = t.slice( 0, node.start ) + r + t.slice( node.end );
					count++;
			}
			textbox.focus();
			if ( t !== textbox.value ) {
				var s = textbox.scrollTop, s0 = textbox.selectionStart, s1 = textbox.selectionEnd;
				textbox.value = t;
				textbox.selectionStart = s0, textbox.selectionEnd = s1, textbox.scrollTop = s;
				s = summary.value,
				s0 = s.length;
				s = s.replace( /^\s+|\s+$/g, '' );
				if ( /\d+\W*externer? Links?\s+geändert$/.test( s ) ) {
					s = s.replace( /(\d)+\W*(?=externer? Links?\s+geändert$)/,
						function( $0, $1 ) { return Math.max( $1, count ) + '+ '; } );
				} else {
					if ( /[^!,./:;?]$/.test( s ) ){
						s += ';';}
					if ( /\S$/.test( s ) ) {
						s += ' ';}
					s += count + ' externe' + ( count > 1 ? ' Links' : 'r Link' ) + ' geändert';
				}
				summary.value = s, summary.selectionStart = s0, summary.selectionEnd = s.length;
				mw.hook( 'AutoFormatterDoneWithChange' ).fire();
			}
			$( '#linkCheckerBox' ).remove();
			if ( window.wikEd && window.wikEd.useWikEd ){
				wikEd.UpdateFrame();}
			return false;
			}
		);
		$( '#linkCheckerBox .buttons a.cancelLink' ).on( 'click', function() {
			$( '#linkCheckerBox' ).remove();
			return false;
		} );
		$( '#linkCheckerBox a.pref' ).on( 'click', function() {
			$( '#linkCheckerBox form.pref' ).show();
			$( '#linkCheckerBox .buttons' ).hide();
			return false;
		} );
		$( '#linkCheckerBox .pref' ).on( 'submit', function() {
			option( 'autoLimit', $( '#prefAutoLimit' )[0].value );
			option( 'context', $( '#prefContext' )[0].checked );
			option( 'search', $( '#prefSearch' )[0].value );
			$( '#linkCheckerBox form.pref' ).hide();
			$( '#linkCheckerBox .buttons' ).show();
			return false;
		} );
		$( '#linkCheckerBox .pref a.cancelLink' ).on( 'click', function() {
			$( '#linkCheckerBox form.pref' ).hide();
			$( '#linkCheckerBox .buttons' ).show();
			return false;
		} );
	}
	function  HTMLrow ( textboxValue , uriArray, i , myoptions ) {
		let tree = createContextTree(textboxValue, uriArray[i].index, uriArray[i].index + uriArray[i][0].length);
		if ( !tree ) {
			return ''}
		if ( tree.parent && tree.parent.uri ) {
			uriArray[i][0] = tree.parent.uri;}
		const ishttp =  /http:/.test(uriArray[i][0]);
		const webarchiv = parseWebarchiv( uriArray[i][0] );
		const timestamp = ( tree.archive && tree.archive.timestamp ) || ( webarchiv && webarchiv.timestamp );
		const atoday = ( tree.archive && tree.archive.is ) || ( webarchiv && webarchiv.is );
		const wcite = ( tree.archive && tree.archive.id ) || ( webarchiv && webarchiv.id );
		const myuri = webarchiv && webarchiv.url || uriArray[i][0];
		const {sortRecherche, hintergrundfarbe} = colorsort (tree, webarchiv, atoday, ishttp );
		const site = myuri.replace( /^[^/]*\/+(?:www\.)?/i, '' ).replace( /\/.*$/, '' );
		const euquery = myuri.replace( /[^/]+$/, '' ).replace( /^[^/]*\/+/, '' ).replace( /^www\./i, '*.' );
		const {contextvar, linktext } =contextinfo(tree);
		const contextspalte = myoptions.context ? `<td>${contextvar}</td>` :``;
		let archivelinks='',texturi='';
		if ( atoday ) {
			const slashend = /^\d{4}\W?\d\d\W?\d\d/.test( atoday ) ? '/' + myuri : '';
			archivelinks= `<a href="https://archive.today/${atoday + slashend }"
			target="_blank" title="archive.today">.is</a>`;
		} else if ( wcite ){
			archivelinks= `<a href="http://www.webcitation.org/query.php?url=${myuri}"
			target="_blank" title="WebCite (webcitation.org)">webC</a>`;
		} else {
			archivelinks=`<a href="https://archive.today/20070000000000/${myuri}"
			target="_blank" title="archive.today">T</a>
			<a href="http://timetravel.mementoweb.org/list/2010/${myuri}"
			target="_blank" title="Mementoweb">M</a>
			<a href="http://www.webcitation.org/query.php?url=${myuri}"
			target="_blank" title="WebCite (webcitation.org)">C</a>`;}
		if ( webarchiv && webarchiv.url ){
			texturi = webarchiv.archive;
		} else if (/^\w*:\/+[^/]+\.\w+$/.test(uriArray[i][0])){
			texturi = uriArray[i][0].toLowerCase() + '/';
		} else if ( /^\w*:\/+[^/]*[A-Z]/.test( uriArray[i][0] ) ){
			texturi = uriArray[i][0].replace( /^\w*:\/+[^/]*/, function( $0 ) { return $0.toLowerCase(); } );
		} else if ( /<!--.*?-->/.test( uriArray[i][0] ) ){
			texturi = uriArray[i][0].replace( /<!--.*?-->/g, '' );
		}
		const euquerylink = `&nbsp;<a class="exturlusage"
			href="/wiki/Special:LinkSearch/${euquery}" target="_blank"
			title="Weblinksuche innerhalb der Wikipedia"><span
			style="display:none">${sortRecherche}</span>LS</a></td>
			<td><input name="r${i}" type="url" autocomplete="off" value="`;
		const linktitle = `"></td><td
			data-sort-value="${ mw.html.escape( linktext.replace( /^[^\w\xC0-\u1FFF]+/, '' ) )}">
			<input name="t${i}" type="text"
			value="${ mw.html.escape( linktext.replace( /[\n\r\t ]+/g, ' ' ) ) }"></td></tr>`
		const htmlZeileurltabelle = `
			<tr class="uri${i} hintergrundfarbe${hintergrundfarbe}"><td><a class="goto"
			data-number="${uriArray[i].number}" data-uri="${myuri}" href="${myuri}" title="Gehe zu${uriArray[i].i > 0 ?
			'm ' + (uriArray[i].i + 1) + `. Vorkommen dieses externen Links` : ` diesem externen Link` }">↓</a>
			${ linkverzeichnisse(myuri)}</td>${contextspalte}
			<td ${((uriArray.length <= myoptions.autoLimit)?('data-sort-value="0"'):('data-sort-type="text"'))}>
			<a href="${mw.html.escape( myoptions.search.replace( /%s/g, 'site:' +
				encodeURIComponent( site + ( linktext ? ' ' + linktext : '' ) ) ) )
			}" target="_blank" title="Websuche">G</a>&nbsp;
			<a href="https://wayback.archive.org/web/${timestamp || '*' }/${myuri}"
			target="_blank"
			title="Wayback Machine beim Internet Archive (archive.org)">IA</a>&nbsp;
			${archivelinks}${euquerylink}${texturi}${linktitle}`
		euqueryresult(euquery, uriArray , myoptions)
		return htmlZeileurltabelle
	}
function htmlTable(textboxValue , uriArray,  myoptions ){
		let htmlZeilen=[]
		for ( let i = 0; i < uriArray.length; i++ ) {
			htmlZeilen.push(HTMLrow ( textboxValue , uriArray , i , myoptions ) )
		}
		const htmlKopfurltabelle = `
			<div id="linkCheckerBox" style="padding:1em 0"><form action="#">
			<div style="border:solid silver;border-width:1px 0;clear:both;max-height:23.1em;overflow:auto">
			<table class="wikitable sortable" style="margin:-1px 0;width:100%">
			<tr><th width="32%">Original</th>
			${myoptions.context ? '<th style="visibility:"visible";width="10%";>Kontext</th>' : ''}
			<th width="6%">Recherche</th>
			<th class="unsortable" width="10%"><acronym
			title="Archivlinks einfach komplett einfügen">Ersatz</acronym></th>
			<th width="42%">Beschriftung</th></tr>`;
		const htmlFussurltabelle = `</table></div>
			<div class="buttons editOptions" style="margin:0;padding-bottom:.5em;padding-top:.5em;">
			<input type="submit" value="Änderungen übernehmen">
			<a class="cancelLink" href="#">Abbrechen</a><span class="mw-editButtons-pipe-separator"> | </span>
			<a class="pref" href="#">Einstellungen</a>
			</div></form>
			<form action="#" class="pref" style="display:none"><fieldset><legend>Einstellungen</legend>
			<input id="prefContext" type="checkbox" value="1"${myoptions.context ? ' checked="checked"' : ''}>
			<label for="prefContext"> Kontextinformationen für die Fundstellen anzeigen</label><br />
			Websuchmaschine: <input id="prefSearch" size="40" type="text"
			value="${mw.html.escape(myoptions.search)}">
			<small>alternativ z.B. http://www.google.de/search?q=%s eintragen</small><br />
			<span  style="display:none">Obergrenze für die Anzeige der Verwendungshäufigkeit:
			<input id="prefAutoLimit" min="0" size="4" type="number"
			value="${mw.html.escape(myoptions.autoLimit)}"> externe Links im Artikel<br />
			</span >   //'Automatische Ersetzungen (z.&thinsp;B. <code>www.alt.de/ www.neu.de/</code>):
			<br /><textarea rows="5"></textarea>
			<input type="submit" value="Einstellungen speichern">
			<a class="cancelLink" href="#">Abbrechen</a>
			</fieldset></form>
			</div>`;
		$( '#editform' ).before(  htmlKopfurltabelle + htmlZeilen.join('\n') + htmlFussurltabelle );
		return true;}
	function colorsort (tree, webarchiv, atoday, ishttp ){
		let sortRecherche='9';
		let hintergrundfarbe= '1';
		if (( tree.archive || webarchiv )
			&& (findParameter( tree.parent.parameters, 'archivebot', '\\S.*' ) >= 0
			|| findParameter( tree.parent.parameters, 'archiv-bot', '\\S.*' ) >= 0) ) {sortRecherche='3';
				hintergrundfarbe='6';
		} else if ( atoday && !/^\d{14}/.test( atoday ) ) {sortRecherche='2';
			hintergrundfarbe='7';//strict mode
		} else if ( tree.parent && ( /^(?:Toter|Dead) Link$/i.test( tree.parent.type ) ||
			findParameter( tree.parent.parameters, 'offline', '\\S.*' ) >= 0 )
			&& (webarchiv == false)) {hintergrundfarbe='8';
			sortRecherche='1';
		} else if ( tree.archive || webarchiv ){hintergrundfarbe='5';
			sortRecherche='4';
		} else if ( ishttp ){hintergrundfarbe='2';
			sortRecherche='5';
		} else {hintergrundfarbe='1';
			sortRecherche='6';
		}
		return {hintergrundfarbe: hintergrundfarbe,
			sortRecherche: sortRecherche}
	}
	function contextinfo (tree) {
		let contextvar = '';
		let text = tree.text || '';
		let node = tree.parent;
		while ( node ) {
			if ( contextvar ){
				contextvar = '&#x200A;→&#x200A;' + contextvar;}

			contextvar = ( node.type === 'LINK' ? 'Link' : node.type === 'REF' ? 'Ref.' :
			node.type.replace( /^Infobox.*/, 'Infobox' ) ) + contextvar;
			if ( !text ) {
				text = node.text || '';
			}
			node = node.parent;
		}
		return {contextvar: contextvar,
				linktext: text}
	}
	function linkverzeichnisse (myuri){
		let dirs = myuri.split(/(^[^/?]+\/+[^/?]+\/*|\?[^?]+|[^/?]+\/*)/);
		if ( dirs.length <= 0 ) {
			dirs = [myuri];}
		let htmldirs=''
		for ( let d = 0; d < dirs.length; d++ ) {
			if ( !dirs[d] ) {
				continue;}
			let href = dirs.slice(0, d + 1).join('');
			htmldirs += '<a href="' + mw.html.escape(href) + '" target="_blank">';
			if (dirs[d].length > 3 && href.indexOf('?') >= 0) {
				htmldirs += mw.html.escape(dirs[d].charAt()) + '…';
			} else {
				htmldirs += mw.html.escape(dirs[d]
				.replace(/^(?:\w+:\/+|www\.)*/, '')
				.replace(/#...+/, '#…'))
				.replace(/\B_\B/g, '_<wbr>');
			}
			htmldirs += '</a>';
		}
		return  htmldirs;
	}
	function euqueryresult (euquery, uriArray , myoptions) {
	if ( euquery && uriArray.length <= myoptions.autoLimit ) {
		( function( i ) {
			$.ajax( '//de.wikipedia.org/w/api.php?action=query&format=xml&list=exturlusage&euprop=&euquery=' + euquery, {
				dataType: 'html',
				error: function( o, s, e ) { alert( e ); },
					success: function( data, s, o ) {
						let c = data.indexOf( 'euoffset' ) > 0 ? '10+' :
						Math.round( ( data.indexOf( '/exturlusage' ) - 47 ) / 6 );
						if ( typeof c === 'string' || c > 0 ) {
							let euuri = $( '.uri' + i + ' .exturlusage' ); /* doto:Testen: scope fraglich ev neue Varible notwendig */
							euuri.text( c );
							euuri.parent().attr( 'data-sort-value', typeof c === 'number' ? c : 10 );
						}
					}
				} );
			} )( i );
		}
	}
	function createContextTree( textbox, uriStart, uriEnd ) {
		let tree = { type: 'URI', start: uriStart, end: uriEnd }, node = tree;
		while ( node && node.type !== 'REF' ) {
			node.parent = findParent( textbox, node.start, node.end );
			node = node.parent;
		}
		if ( tree.parent.parameters ) {
			const archivurlparameterMatch = /\|\s*archiv[e-]url\s*=\s*(https?:\/\/[^\s|}]+)/.exec(textbox.slice(tree.parent.start, tree.parent.end));
			if ( archivurlparameterMatch ) {
				/* Bei Vorlagen mit zwei externen Links den Archivlink nicht als eigenständig behandeln */
				if (tree.parent.start + archivurlparameterMatch.index + archivurlparameterMatch[0].length - archivurlparameterMatch[1].length !== tree.start) {
					return false;}
				/* Archivlink statt dessen als Parameter beim Originallink mitführen */
				tree.archive = parseWebarchiv(archivurlparameterMatch[1]) || { archive: archivurlparameterMatch[1] };
				/* Original-URL retten, wenn sie sich nicht aus dem Archivlink ergibt */
				const urlparameterMatch = /\|\s*url\s*=\s*(https?:\/\/[^\s|}]+)/.exec(textbox.slice(tree.parent.start, tree.parent.end));
				if (!tree.archive.url && urlparameterMatch) {
					tree.archive.url = urlparameterMatch[1];}
				if (/url$/.test(tree.parent.parameter)) {
					tree.parent.parameter = 'url';}
	} else if ( tree.parent.type === 'Webarchiv' ) {
		const webarchivWaybackMatch = /\|\s*(?:wayback|1)\s*=\s*([\d.:*-]+)/.exec( textbox.slice( tree.parent.start, tree.parent.end ) ) ;
		const webarchivWebcitMatch = /\|\s*webciteID\s*=\s*(\w+)/.exec( textbox.slice( tree.parent.start, tree.parent.end ) );
		const webarchivArchvietodayMatch = /\|\s*archive-(?:is|today)\s*=\s*([^\s{|}]+)/.exec( textbox.slice( tree.parent.start, tree.parent.end ) );
		const webarchivParamtersMatch = /^[^|]*\|\s*([\d*]+)/.exec( textbox.slice( tree.parent.start, tree.parent.end ) )
		if ( webarchivWaybackMatch ) {
				tree.archive = { timestamp: webarchivWaybackMatch[1].replace(/[:.\-]/g,'') };
			} else if ( webarchivWebcitMatch ) {
				tree.archive = { id: webarchivWebcitMatch[1] };
			} else if ( webarchivArchvietodayMatch ) {
				tree.archive = { is: webarchivArchvietodayMatch[1].replace(/(\d{4})[:.\-]?(\d{2})[:.\-]?(\d{0,2})[ T.\-]?(\d{0,2})[:.\-]?(\d{0,2})[:.\-]?(\d{0,2})/,'$1$2$3$4$5$6') };
			} else if ( webarchivParamtersMatch ){
				tree.archive = { timestamp: webarchivParamtersMatch[1].replace(/[ :.\-]/g,'') };
			}
		}
	}
	return tree;
	}
	function findParent( textbox, parsedStart, parsedEnd ) {
		let i = parsedStart, skipSquare = 0, skipCurly = 0, parameter = undefined;
		while ( --i >= 0 ) {
			if ( textbox.charAt( i ) === '|' && skipCurly <= 0 && !parameter && parameter !== false ) {
				const pmArray = /^\s*([^={|}]*?)\s*=\s*$/.exec( textbox.slice( i + 1, parsedStart ) );
				parameter = pmArray ? pmArray[1] : false;
			} else if ( textbox.charAt( i ) === '}' ) {
				skipCurly++;
			} else if ( textbox.charAt( i ) === '{' && skipCurly-- <= 0 ) {
				i--;
				/* Schachtelung am Anfang ist geklärt, am Ende noch nicht */
				const pmArraya = /^\{\s*([^{|}]*?)\s*\|/.exec( textbox.slice( i + 1, parsedStart ) );
				const pmArrayb = /^(?:[^{}]|\{+[^{}]*\}\})*\}\}/.exec( textbox.slice( parsedEnd ) );
				if ( !pmArraya || !pmArrayb ) {
					return false;
				}
				let node = {
					type: pmArraya[1][0].toUpperCase() + pmArraya[1].slice( 1 ).replace( /_/g, ' ' ),
					start: i,
					end: parsedEnd + pmArrayb[0].length,
					parameter: parameter,
					parameters: ( textbox.slice( i, parsedEnd ) + pmArrayb[0] ).split( /(\|(?:[^{|}]|\{+[^{}]*\}\})*)/ )};
				let pmArrayca;
				let pmArrayda;
				if ( !node.text && ( pmArrayca = /\|\s*(?:Text|Titel|Title|3)\s*=\s*((?:[^{|}]|\{+[^{}]*\}\})*?)\s*[|}]/i.exec( textbox.slice( node.start, node.end ))  ) ) {
					node.text = pmArrayca[1];
				}
				if ( !node.text && node.type === 'Webarchiv' && node.parameters.length > 5
					&& ( pmArrayda = /^\|\s*([^=]*?)\s*$/.exec( node.parameters[5] ) )
				) {
					node.text = pmArrayda[1];
				}
				return node;
			} else if ( textbox.charAt( i ) === ']' ) {
				skipSquare++;
			} else if ( textbox.charAt( i ) === '[' && skipSquare-- <= 0 ) {
				const pmArrayea = /^\s*$/.test( textbox.slice( i + 1, parsedStart ) );
				/* Einfache Schachtelung akzeptieren, aber sofort verwerfen */
				const pmArrayeb = /^((?:<!--[^>]*-->|[^\s[\]])*)(?:\s+((?:[^[\]]|\[\[[^[\]]*\]\])*))?\]/.exec(textbox.slice(parsedEnd));
				if ( !pmArrayea || !pmArrayeb ) {
					return false;
				}
				return { type: 'LINK', start: i, end: parsedEnd + pmArrayeb[0].length,
					uri: textbox.slice( parsedStart, parsedEnd + pmArrayeb[1].length ),
					text: pmArrayeb[2] ? pmArrayeb[2].replace( /[[\]]+/g, '' ) : '' };
			} else if ( textbox.charAt( i ) === '\n' && skipCurly <= 0 ) {
				const pmArrayfa = /^\* *$/.test( textbox.slice( i + 1, parsedStart ) );
				const pmArrayfb = /^ +([^\r\n<>[\]{|}]*[^\s<>[\]{|}])/.exec( textbox.slice( parsedEnd ) );
				if ( pmArrayfa && pmArrayfb ) {
					const newtextbox = pmArrayfb[1].replace(/^[\s:–-]+/, '');
					if ( newtextbox ) {
						return { type: 'LINK', start: parsedStart, end: parsedEnd + pmArrayfb[0].length, text: newtextbox };
					}
				}
			} else if ( textbox.charAt( i ) === '<' ) {
				const myslice = textbox.slice( i + 1, parsedStart );
				let pmArraygb;
				if ( /^ref\b(?![^<>]*\/>)[^<>]*>[^<>]*$/i.test( myslice ) ) {
					pmArraygb = /^(?:[^<>]|<!--[^<>]*-->|<(?!\w)|<(abbr|[biq]|bd[io]|em|nowiki|mapframe|maplink|small|strong|su[bp])\b[^<>]*>[^<>]*<\/\1\s*>)*<\/ref\s*>/i.exec( textbox.slice( parsedEnd ) );
				}
				if ( pmArraygb ) {
					return { type: 'REF', start: i, end: parsedEnd + pmArraygb[0].length };
				} else if ( !/^(?:\W|\/?(?:abbr|[biq]|bd[io]|em|nowiki|small|mapframe|maplink|strong|su[bp])\b)/i.test( myslice ) ) {
					return false;
				}
			}
		}
	return false;
	}
	function parseWebarchiv( uri ) {
		return parseWayback( uri ) || parseWebCite( uri ) || parseArchiveIs( uri );
	}
	function parseWayback( uri ) {
		const matchWayback = /\barchive\.org\b\/w?e?b?\/?(\b(\d{4})[.:-]?(\d\d)[.:-]?(\d\d)[.:-]?\d{0,6}[A-z_]{0,3}|\/\*)\/(\S*)/i.exec( uri );
		if ( !matchWayback ) {
			return false;
		}
		if ( matchWayback[2] && ( matchWayback[2] < 1970 || matchWayback[2] > new Date().getFullYear()
			|| matchWayback[3] < 1 || matchWayback[3] > 12 || matchWayback[4] < 1 || matchWayback[4] > 31 ) ) {
			return false;
		}
		const wbtimestamp = matchWayback[2] ? (matchWayback[1].replace(/\D+/,'')) : '*';
		const wburl = /^\w+:\/\//.test(matchWayback[5]) ? matchWayback[5] : matchWayback[5].replace(/^(?:http(s?):)?\/*/, 'http$1://');
		return { archive: 'https://web.archive.org/web/' + wbtimestamp + '/' +  wburl,
			url:  wburl, timestamp: wbtimestamp, date: matchWayback[2] ? matchWayback[2] + '-' + matchWayback[3] + '-' + matchWayback[4] : '' };
	}
	function webCiteBase62ToDate( id ) {
		if ( /^\w{1,9}$/.test( id ) ) {
			for ( let i = 0, s = 0; c = id.charCodeAt( i ); i++ ) {
				s *= 62;
				s += c - [ , 48, 55, 61][c >> 5];
			}
			id = s;
		}
		if ( id > 0 ) {
			return new Date( id / 1000 ).toISOString().substring( 0, 10 );
		}
	}
	function parseWebCite( uri ) {
		const uriMatch = /\bwebcitation\.org\/(.*\bid=(\d+)|\w{1,9}$)/i.exec( uri );
		if ( !uriMatch ) {
			return false;
		}
		const id = uriMatch[2] ? uriMatch[2] : uriMatch[1];
		const dateMatch = /\bdate=(\d{4}-\d\d-\d\d)/i.exec( uri );
		const date = dateMatch && dateMatch[1] || webCiteBase62ToDate( id );
		return { archive: 'http://www.webcitation.org/' + id, id: id, date: date };
	}
	function parseArchiveIs( uri ) {
		const reArchiveWithdate =  /\barchive\.(?:fo|is|li|md|ph|today|vn|ec)\/((\d{4})[.:\-]?(\d\d)[.:\-]?(\d\d)[\d.:\-]*)\/(\S+)/
		const reArchiveOther = /\barchive\.(?:fo|is|li|md|ph|today|vn|ec)\/(\S+)/
		if ( reArchiveWithdate.test( uri ) ) {
			const newuri = uri.replace( /^https?:\/\/archive\.(?:fo|is|li|md|ph|today|vn|ec)\//, 'https://archive.today/' );
			const uriParts =  reArchiveWithdate.exec( newuri )
			return { archive: newuri, is: uriParts[1].replace(/\D+/g, ''),
				url: uriParts[5].replace(/^(?:http(s?):)?\/*/, 'http$1://'),
				date: uriParts[2] + '-' + uriParts[3] + '-' + uriParts[4] };
		}
		if ( reArchiveOther.test( uri ) ) {
			const uriParts = reArchiveOther.exec( uri )
			return { archive: uri,
				is: uriParts[1] };
		}
		return false;
	}
	function findParameter( myarray, name, value ) {
		let r = -1;
		if (!myarray) return r;
		const regexFindParameter = new RegExp('^\\s*\\|\\s*' + name + '\\s*=' + (value ? '\\s*' + value + '\\s*$' : ''));
		for (let i = myarray.length; i--; )
		{
			if (regexFindParameter.test(myarray[i])){
				if (r < 0) {
					r = i;
				/* Drop duplicate parameters */
				} else {
					myarray[i] = '';
				}
			}
		}
		return r;
	}
	function putParameter( myarray, name, value, where ) {
		value = ( value || '' ).replace( /\|+(?![^{}]*\}\})/g, '–' ).replace( /\$/g, '$$$$' );
		let id = findParameter( myarray, name );
		if ( id >= 0 ) {
			if ( value )
				myarray[id] = myarray[id].replace(/^([^=]*=\s*)(?:[^{}]|\{+[^{}]*\}\})*?(\s*\}*)$/, '$1' + value + '$2');
			return myarray;
			}
			let wherenew = where;
			if ( typeof wherenew !== 'number' ) {
				let wherenewidx = myarray.length - 1;
				if (where)
				{
					const regexPutParameter = new RegExp('^\\|\\s*(?:' + where.join('|') + ')\\s*=');
					for (let idx = myarray.length; idx--; )
					{
						if (regexPutParameter.test(myarray[idx])) { wherenewidx = idx; break; }
					}
					wherenew=wherenewidx;
				}
			}
			name = name.replace(/\$/g, '$$$$');
			if (wherenew <= 0) {
				myarray[wherenew] = myarray[wherenew].replace(/(\s*)$/, ' | ' + name + '=' + value + '$1');
			} else {
				myarray[wherenew] = myarray[wherenew].replace(/^((\|\s*)[\s\S]*?(\s*))(\}*)$/, '$1$2' + name + '=' + value + '$3$4');
			}
			return myarray;
	}
	function deleteParameter( myarray, name ) {
		if (!myarray) return myarray;
		let regexDeletParameter = new RegExp('^\\|\\s*(?:' + (typeof name === 'string' ? name : name.join('|')) + ')\\s*=[^|]*(?=\\}\\}$|$)');
		for (let i = myarray.length; i--; ){
			myarray[i] = myarray[i].replace(regexDeletParameter, '');}
		return myarray;
	}
	function option( key, value ) {
		let optionkey = 'externalURLform' + key[0].toUpperCase() + key.slice(1);
		if (typeof value === 'boolean') {
			value = value ? '1' : '';}
		if (typeof value !== 'undefined' && localStorage){
			localStorage[optionkey] = value;}
		value = localStorage && localStorage[optionkey];
		if (typeof value === 'undefined') {
			value = window[optionkey];}
		switch (key.toLowerCase()) {
			case 'autolimit': value = value || 8; break;
			case 'search': value = value || 'http://duckduckgo.com/?q=%s'; break;
		}
		return '' + value;
	}
} )( jQuery, mediaWiki );
