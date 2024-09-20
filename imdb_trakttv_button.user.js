// ==UserScript==
// @name         IMDB List - Trakt.tv Button
// @version      1.2
// @description  Adds a button linking to the corresponding Trakt.tv page to any chart subpage on IMDB
// @author       SecretUnicorn & LenAnderson
// @match        https://www.imdb.com/chart/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
		const list = document.getElementsByClassName("ipc-metadata-list").item(0);
  	const regex = /\/title\/(tt\d+)\//;
  	Array.from(list.children).forEach(li => {
    	const link = li.getElementsByTagName("a").item(0)
      const match = link.href.match(regex);
      if (match && match[1]) {
        const id = match[1];
        const lastDiv = li.getElementsByClassName("cli-post-element").item(0);
        lastDiv.style = "align-items: center";
        let a = document.createElement('a'); {
        a.href = `https://trakt.tv/search/imdb/${id}`;
      	a.target = "_blank"
      	a.referrer = "noref"
        a.style.display = 'inline-block';
        a.style.height = '32px';
        a.style.width = '32px';
        a.style.backgroundImage = `url("data:image/png;base64,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")`;
        a.title = 'Trakt.tv';
        lastDiv.appendChild(a);
    }
      }
    })
    
})();
