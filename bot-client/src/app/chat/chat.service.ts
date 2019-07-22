import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Location, MessageConfig } from '../models';
import { FavoritesService } from './favorites.service';
import { PlacesService } from './places.service';

@Injectable()
export class ChatService {
  private readonly token = environment.dialogflow.eventsBot;
  private readonly baseURL = 'https://api.dialogflow.com/v1/query?v=20150910';

  chatMessages: BehaviorSubject<any[]>;
  possibleAnswers: BehaviorSubject<string[]>;
  locationsList: Location[];
  currentLocation: Location;
  private listStartIndex = 0;
  private listAmount = 4;

  usersAddress: string;
  isLoading: BehaviorSubject<boolean>;
  isLoadingPossibleAnswers: BehaviorSubject<boolean>;

  constructor(
    private readonly http: HttpClient,
    private readonly placesService: PlacesService,
    private readonly favoritesService: FavoritesService,
  ) {
    this.chatMessages = new BehaviorSubject([]);
    this.isLoading = new BehaviorSubject(true);
    this.isLoadingPossibleAnswers = new BehaviorSubject(false);
    this.possibleAnswers = new BehaviorSubject([]);
    this.initial();
  }

  /**
   * Headers for http requests
   */
  private get headers() {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    });
  }

  /**
   * Initial chat message that comes from the bot.
   */
  private initial() {
    this.getResponse('Hello').subscribe((r: any) => {
      this.addMessageToChat({ text: r.result.fulfillment.speech, bot: true });
      this.possibleAnswers.next(['I am fine', 'Great','I am good','Awesome']);
    });
}

  /**
   * Ask the bot for something.
   * @param input Message text
   */
  askBot(input) {
    this.possibleAnswers.next([]);
    this.addMessageToChat({ text: input, bot: false });

    this.getResponse(input).subscribe((r: any) => {
      console.log(r);
      r.result.fulfillment.messages.forEach(message => {
        console.log(message);
        if (message.speech) {
          this.addMessageToChat({ text: message.speech, bot: true });
        }
        if (message.payload) {
          if (message.payload.response.types) {
            const list = message.payload.response.types;
            this.addMessageToChat({ text: message.speech, bot: true, selectionList: list });
          }
          if (message.payload.response.possibleAnswers) {
            console.log(message.payload.response.possibleAnswers);
            console.log(message.payload.response.possibleAnswers)
            this.possibleAnswers.next(message.payload.response.possibleAnswers);
          }
        }
      });

    });
  }

  /**
   * Add a new message to the chat log
   * @param message Message text
   * @param isBot Is the message from the bot?
   */
  addMessageToChat(options: MessageConfig) {
    this.chatMessages.next([...this.chatMessages.value, {
      id: Math.random(),
      text: options.text,
      textAsHtml: options.textAsHtml,
      locationsList: options.locationsList,
      selectionList: options.selectionList,
      bot: options.bot,
      locationDetail: options.locationDetail,
      date: Date.now(),
      title: options.title,
    }]);
  }

  /**
   * Send a message to dialog flow
   * @param query Message that will be parsed by dialogflow
   */
  getResponse(query: string) {
    const data = {
      lang: 'en',
      query,
      sessionId: '12345',
      timezone: 'Asia/Colombo'
    };
    this.isLoading.next(true);
    return this.http.post(`${this.baseURL}`, data, { headers: this.headers }).pipe(
      map((res) => { this.isLoading.next(false); return res; }),
      catchError(this.handleError('getResponse', []))
    );
  }


  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(error);
      // console.log(`${operation} failed: ${error.message}`);

      // Let the app keep running by returning an empty result.
      return of(result as T);
    };
  }
}
